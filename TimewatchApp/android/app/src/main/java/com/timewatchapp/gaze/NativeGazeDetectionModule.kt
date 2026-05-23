package com.timewatchapp.gaze

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

class NativeGazeDetectionModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), SensorEventListener {
  private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
  private val isProcessingFrame = AtomicBoolean(false)
  private val detector: FaceDetector = createFaceDetector()
  private val sensorManager: SensorManager? =
    reactContext.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
  private val accelerometer: Sensor? =
    sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
  private var cameraProvider: ProcessCameraProvider? = null
  private var imageAnalysis: ImageAnalysis? = null
  private var isRunning = false
  private var isDevicePostureRunning = false
  private var lastEmittedStatus: String? = null
  private var lastEmittedEyeState: String? = null
  private var lastEmittedWinkSide: String? = null
  private var lastEmittedAtMs: Long = 0L
  private var lastEmittedPosture: String? = null
  private var lastEmittedPostureAtMs: Long = 0L
  private var cameraStartGeneration = 0
  private var lastFrameAnalysisAtMs = 0L
  @Volatile private var winkSensitivityLevel = DEFAULT_WINK_SENSITIVITY_LEVEL
  @Volatile private var winkDistanceLevel = DEFAULT_WINK_DISTANCE_LEVEL
  @Volatile private var lookAngleLevel = DEFAULT_LOOK_ANGLE_LEVEL
  @Volatile private var analysisResolutionWidth = DEFAULT_ANALYSIS_WIDTH
  @Volatile private var analysisResolutionHeight = DEFAULT_ANALYSIS_HEIGHT
  @Volatile private var frameIntervalMs = DEFAULT_FRAME_INTERVAL_MS

  override fun getName(): String = NAME

  @ReactMethod
  fun start(promise: Promise) {
    if (isRunning && imageAnalysis != null) {
      promise.resolve(null)
      return
    }

    if (
      ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) !=
        PackageManager.PERMISSION_GRANTED
    ) {
      emitReading("unknown", 0.0, "unknown", null)
      promise.reject("E_CAMERA_PERMISSION", "Camera permission is required for gaze detection.")
      return
    }

    val lifecycleOwner = reactContext.currentActivity as? LifecycleOwner
    if (lifecycleOwner == null) {
      emitReading("unknown", 0.0, "unknown", null)
      promise.reject("E_NO_ACTIVITY", "A foreground activity is required to start gaze detection.")
      return
    }

    val cameraProviderFuture = ProcessCameraProvider.getInstance(reactContext)
    val startGeneration = ++cameraStartGeneration
    cameraProviderFuture.addListener(
      {
        try {
          if (startGeneration != cameraStartGeneration) {
            promise.resolve(null)
            return@addListener
          }

          val provider = cameraProviderFuture.get()
          bindImageAnalysis(provider, lifecycleOwner)
          cameraProvider = provider
          isRunning = true
          promise.resolve(null)
        } catch (error: Exception) {
          emitReading("unknown", 0.0, "unknown", null)
          promise.reject("E_CAMERA_START_FAILED", error)
        }
      },
      ContextCompat.getMainExecutor(reactContext),
    )
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopCamera()
    promise.resolve(null)
  }

  @ReactMethod
  fun startDevicePosture(promise: Promise) {
    if (isDevicePostureRunning) {
      promise.resolve(null)
      return
    }

    val manager = sensorManager
    val sensor = accelerometer
    if (manager == null || sensor == null) {
      emitDevicePostureReading("unknown")
      promise.resolve(null)
      return
    }

    isDevicePostureRunning =
      manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI)
    promise.resolve(null)
  }

  @ReactMethod
  fun stopDevicePosture(promise: Promise) {
    stopDevicePostureSensor()
    promise.resolve(null)
  }

  @ReactMethod
  fun setWinkSensitivity(level: Double, promise: Promise) {
    winkSensitivityLevel = normalizeWinkSensitivityLevel(level.toInt())
    promise.resolve(null)
  }

  @ReactMethod
  fun setWinkDistanceLevel(level: Double, promise: Promise) {
    winkDistanceLevel =
      level
        .toInt()
        .coerceIn(MIN_WINK_DISTANCE_LEVEL, MAX_WINK_DISTANCE_LEVEL)
    promise.resolve(null)
  }

  @ReactMethod
  fun setLookAngleLevel(level: Double, promise: Promise) {
    lookAngleLevel =
      level
        .toInt()
        .coerceIn(MIN_LOOK_ANGLE_LEVEL, MAX_LOOK_ANGLE_LEVEL)
    promise.resolve(null)
  }

  @ReactMethod
  fun setAnalysisResolution(width: Double, height: Double, promise: Promise) {
    val nextWidth =
      width
        .toInt()
        .coerceIn(MIN_ANALYSIS_WIDTH, MAX_ANALYSIS_WIDTH)
    val nextHeight =
      height
        .toInt()
        .coerceIn(MIN_ANALYSIS_HEIGHT, MAX_ANALYSIS_HEIGHT)

    if (analysisResolutionWidth == nextWidth && analysisResolutionHeight == nextHeight) {
      promise.resolve(null)
      return
    }

    analysisResolutionWidth = nextWidth
    analysisResolutionHeight = nextHeight

    val provider = cameraProvider
    val lifecycleOwner = reactContext.currentActivity as? LifecycleOwner
    if (isRunning && provider != null && lifecycleOwner != null) {
      bindImageAnalysis(provider, lifecycleOwner)
    }

    promise.resolve(null)
  }

  @ReactMethod
  fun setFrameIntervalMs(intervalMs: Double, promise: Promise) {
    frameIntervalMs =
      intervalMs
        .toLong()
        .coerceIn(MIN_FRAME_INTERVAL_MS, MAX_FRAME_INTERVAL_MS)
    promise.resolve(null)
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by React Native's native event emitter contract.
  }

  @ReactMethod
  fun removeListeners(count: Double) {
    // Required by React Native's native event emitter contract.
  }

  override fun invalidate() {
    super.invalidate()
    stopCamera()
    stopDevicePostureSensor()
    detector.close()
    analysisExecutor.shutdown()
  }

  override fun onSensorChanged(event: SensorEvent?) {
    if (
      !isDevicePostureRunning ||
        event == null ||
        event.sensor.type != Sensor.TYPE_ACCELEROMETER
    ) {
      return
    }

    val zAxis = event.values.getOrNull(2) ?: return
    val posture =
      when {
        zAxis <= FACE_DOWN_Z_THRESHOLD -> "faceDown"
        zAxis >= FACE_UP_Z_THRESHOLD -> "faceUp"
        else -> "unknown"
      }

    emitDevicePostureReading(posture)
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    // No accuracy-specific handling is needed for coarse face-up/face-down posture.
  }

  private fun bindImageAnalysis(provider: ProcessCameraProvider, lifecycleOwner: LifecycleOwner) {
    val analysisUseCase =
      ImageAnalysis.Builder()
        .setResolutionSelector(
          ResolutionSelector.Builder()
            .setResolutionStrategy(
              ResolutionStrategy(
                Size(analysisResolutionWidth, analysisResolutionHeight),
                ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER,
              ),
            )
            .build(),
        )
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
        .also { useCase ->
          useCase.setAnalyzer(analysisExecutor) { imageProxy ->
            analyzeFrame(imageProxy)
          }
        }

    provider.unbindAll()
    provider.bindToLifecycle(
      lifecycleOwner,
      CameraSelector.DEFAULT_FRONT_CAMERA,
      analysisUseCase,
    )

    imageAnalysis = analysisUseCase
  }

  @androidx.annotation.OptIn(ExperimentalGetImage::class)
  private fun analyzeFrame(imageProxy: ImageProxy) {
    if (!isRunning) {
      imageProxy.close()
      return
    }

    val now = System.currentTimeMillis()
    if (frameIntervalMs > 0 && now - lastFrameAnalysisAtMs < frameIntervalMs) {
      imageProxy.close()
      return
    }

    if (!isProcessingFrame.compareAndSet(false, true)) {
      imageProxy.close()
      return
    }
    lastFrameAnalysisAtMs = now

    val mediaImage = imageProxy.image
    if (mediaImage == null) {
      emitReading("unknown", 0.0, "unknown", null)
      imageProxy.close()
      isProcessingFrame.set(false)
      return
    }

    val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
    val frameWidth = imageProxy.width
    val frameHeight = imageProxy.height
    detector
      .process(image)
      .addOnSuccessListener { faces ->
        emitReadingForFaces(faces, frameWidth, frameHeight)
      }
      .addOnFailureListener {
        emitReading("unknown", 0.0, "unknown", null)
      }
      .addOnCompleteListener {
        imageProxy.close()
        isProcessingFrame.set(false)
      }
  }

  private fun emitReadingForFaces(faces: List<Face>, frameWidth: Int, frameHeight: Int) {
    if (faces.isEmpty()) {
      emitReading("notLooking", 1.0, "unknown", null)
      return
    }

    val face =
      faces.maxByOrNull {
        max(0, it.boundingBox.width()) * max(0, it.boundingBox.height())
      } ?: run {
        emitReading("notLooking", 1.0, "unknown", null)
        return
      }

    val lookingAngles = getLookingAngleThresholds()
    val facingScreen =
      abs(face.headEulerAngleY) <= lookingAngles.maxYawDegrees &&
        abs(face.headEulerAngleZ) <= lookingAngles.maxRollDegrees
    val frameArea = max(1, frameWidth) * max(1, frameHeight)
    val eyeReading = resolveEyeReading(face, frameArea.toDouble())
    val status = if (facingScreen) "looking" else "notLooking"
    val confidence = calculateConfidence(face, facingScreen, eyeReading.eyeState, lookingAngles)

    emitReading(status, confidence, eyeReading.eyeState, eyeReading.winkSide)
  }

  private fun resolveEyeReading(face: Face, frameArea: Double): EyeReading {
    val faceArea =
      max(0, face.boundingBox.width()) * max(0, face.boundingBox.height())
    val faceAreaRatio = faceArea.toDouble() / frameArea
    if (faceAreaRatio < getMinFaceAreaRatioForEyeClassification()) {
      return EyeReading("unknown", null)
    }

    val leftEye = face.leftEyeOpenProbability
    val rightEye = face.rightEyeOpenProbability

    if (leftEye == null || rightEye == null) {
      return EyeReading("unknown", null)
    }

    val thresholds = getWinkThresholds()
    val leftClosed = leftEye < thresholds.minEyeOpenProbability
    val rightClosed = rightEye < thresholds.minEyeOpenProbability
    val lowerEye = min(leftEye, rightEye)
    val higherEye = max(leftEye, rightEye)
    val oneEyeLikelyClosed =
      lowerEye < thresholds.maxWinkEyeOpenProbability &&
        higherEye - lowerEye >= thresholds.minWinkEyeProbabilityGap
    val likelyClosedSide = if (leftEye <= rightEye) "left" else "right"

    return when {
      leftClosed && rightClosed -> EyeReading("bothClosed", null)
      leftClosed -> EyeReading("oneEyeClosed", normalizeWinkSide("left"))
      rightClosed -> EyeReading("oneEyeClosed", normalizeWinkSide("right"))
      oneEyeLikelyClosed -> EyeReading("oneEyeClosed", normalizeWinkSide(likelyClosedSide))
      else -> EyeReading("bothOpen", null)
    }
  }

  private fun normalizeWinkSide(side: String): String =
    if (MIRROR_WINK_SIDES_FOR_FRONT_CAMERA) {
      when (side) {
        "left" -> "right"
        "right" -> "left"
        else -> side
      }
    } else {
      side
    }

  private fun getWinkThresholds(): WinkThresholds {
    val ratio =
      getWinkSensitivityOffset(winkSensitivityLevel).toFloat() /
        WINK_SENSITIVITY_STEP_COUNT

    return WinkThresholds(
      minEyeOpenProbability = lerp(STRICT_MIN_EYE_OPEN_PROBABILITY, LOOSE_MIN_EYE_OPEN_PROBABILITY, ratio),
      maxWinkEyeOpenProbability = lerp(STRICT_MAX_WINK_EYE_OPEN_PROBABILITY, LOOSE_MAX_WINK_EYE_OPEN_PROBABILITY, ratio),
      minWinkEyeProbabilityGap = lerp(STRICT_MIN_WINK_EYE_PROBABILITY_GAP, LOOSE_MIN_WINK_EYE_PROBABILITY_GAP, ratio),
    )
  }

  private fun getMinFaceAreaRatioForEyeClassification(): Double {
    val ratio =
      (winkDistanceLevel - MIN_WINK_DISTANCE_LEVEL).toDouble() /
        (MAX_WINK_DISTANCE_LEVEL - MIN_WINK_DISTANCE_LEVEL).toDouble()

    return CLOSE_MIN_FACE_AREA_RATIO_FOR_EYE_CLASSIFICATION +
      ((FAR_MIN_FACE_AREA_RATIO_FOR_EYE_CLASSIFICATION -
        CLOSE_MIN_FACE_AREA_RATIO_FOR_EYE_CLASSIFICATION) * ratio)
  }

  private fun getLookingAngleThresholds(): LookingAngleThresholds =
    when (lookAngleLevel.coerceIn(MIN_LOOK_ANGLE_LEVEL, MAX_LOOK_ANGLE_LEVEL)) {
      1 -> LookingAngleThresholds(STRICT_LOOKING_YAW_DEGREES, FIXED_LOOKING_ROLL_DEGREES)
      3 -> LookingAngleThresholds(LOOSE_LOOKING_YAW_DEGREES, FIXED_LOOKING_ROLL_DEGREES)
      else -> LookingAngleThresholds(DEFAULT_LOOKING_YAW_DEGREES, FIXED_LOOKING_ROLL_DEGREES)
    }

  private fun lerp(start: Float, end: Float, ratio: Float): Float =
    start + ((end - start) * ratio)

  private fun normalizeWinkSensitivityLevel(level: Int): Int =
    when {
      level <= -2 -> -2
      level == -1 -> -1
      level <= 1 -> 1
      level == 2 -> 2
      else -> 3
    }

  private fun getWinkSensitivityOffset(level: Int): Int =
    when (normalizeWinkSensitivityLevel(level)) {
      -2 -> -2
      -1 -> -1
      1 -> 0
      2 -> 1
      else -> 2
    }

  private fun calculateConfidence(
    face: Face,
    facingScreen: Boolean,
    eyeState: String,
    lookingAngles: LookingAngleThresholds,
  ): Double {
    val yawScore = 1.0 - min(1.0, abs(face.headEulerAngleY).toDouble() / lookingAngles.maxYawDegrees)
    val rollScore = 1.0 - min(1.0, abs(face.headEulerAngleZ).toDouble() / lookingAngles.maxRollDegrees)
    val eyeScore =
      when (eyeState) {
        "bothOpen" -> 1.0
        "oneEyeClosed" -> 0.75
        "bothClosed" -> 0.65
        else -> 0.8
      }

    val score = (yawScore * 0.4) + (rollScore * 0.2) + (eyeScore * 0.4)
    return if (facingScreen) {
      max(0.55, min(1.0, score))
    } else {
      max(0.2, min(0.65, score))
    }
  }

  private fun emitReading(status: String, confidence: Double, eyeState: String, winkSide: String?) {
    val now = System.currentTimeMillis()
    if (
      status == lastEmittedStatus &&
        eyeState == lastEmittedEyeState &&
        winkSide == lastEmittedWinkSide &&
        now - lastEmittedAtMs < EMIT_THROTTLE_MS
    ) {
      return
    }

    lastEmittedStatus = status
    lastEmittedEyeState = eyeState
    lastEmittedWinkSide = winkSide
    lastEmittedAtMs = now

    val payload =
      Arguments.createMap().apply {
        putString("status", status)
        putString("eyeState", eyeState)
        if (winkSide == null) {
          putNull("winkSide")
        } else {
          putString("winkSide", winkSide)
        }
        putDouble("confidence", confidence)
      }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(EVENT_NAME, payload)
  }

  private fun emitDevicePostureReading(posture: String) {
    val now = System.currentTimeMillis()
    if (
      posture == lastEmittedPosture &&
        now - lastEmittedPostureAtMs < POSTURE_EMIT_THROTTLE_MS
    ) {
      return
    }

    lastEmittedPosture = posture
    lastEmittedPostureAtMs = now

    val payload =
      Arguments.createMap().apply {
        putString("posture", posture)
      }

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(DEVICE_POSTURE_EVENT_NAME, payload)
  }

  private fun stopCamera() {
    cameraStartGeneration += 1
    imageAnalysis?.clearAnalyzer()
    imageAnalysis = null
    cameraProvider?.unbindAll()
    isProcessingFrame.set(false)
    lastFrameAnalysisAtMs = 0L
    isRunning = false
  }

  private fun stopDevicePostureSensor() {
    if (!isDevicePostureRunning) {
      return
    }

    sensorManager?.unregisterListener(this)
    isDevicePostureRunning = false
  }

  private fun createFaceDetector(): FaceDetector {
    val options =
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .setMinFaceSize(0.15f)
        .build()

    return FaceDetection.getClient(options)
  }

  companion object {
    const val NAME = "NativeGazeDetection"
    const val EVENT_NAME = "TimewatchGazeDetectionReading"
    const val DEVICE_POSTURE_EVENT_NAME = "TimewatchDevicePostureReading"
    private const val FACE_DOWN_Z_THRESHOLD = -9.2f
    private const val FACE_UP_Z_THRESHOLD = 9.2f
    private const val STRICT_LOOKING_YAW_DEGREES = 12.0
    private const val DEFAULT_LOOKING_YAW_DEGREES = 18.0
    private const val LOOSE_LOOKING_YAW_DEGREES = 26.0
    private const val FIXED_LOOKING_ROLL_DEGREES = 50.0
    private const val MIRROR_WINK_SIDES_FOR_FRONT_CAMERA = false
    private const val MIN_LOOK_ANGLE_LEVEL = 1
    private const val MAX_LOOK_ANGLE_LEVEL = 3
    private const val DEFAULT_LOOK_ANGLE_LEVEL = 2
    private const val DEFAULT_WINK_SENSITIVITY_LEVEL = 1
    private const val WINK_SENSITIVITY_STEP_COUNT = 9.0f
    private const val MIN_WINK_DISTANCE_LEVEL = 1
    private const val MAX_WINK_DISTANCE_LEVEL = 5
    private const val DEFAULT_WINK_DISTANCE_LEVEL = 5
    private const val STRICT_MIN_EYE_OPEN_PROBABILITY = 0.25f
    private const val LOOSE_MIN_EYE_OPEN_PROBABILITY = 0.45f
    private const val STRICT_MAX_WINK_EYE_OPEN_PROBABILITY = 0.45f
    private const val LOOSE_MAX_WINK_EYE_OPEN_PROBABILITY = 0.72f
    private const val STRICT_MIN_WINK_EYE_PROBABILITY_GAP = 0.34f
    private const val LOOSE_MIN_WINK_EYE_PROBABILITY_GAP = 0.12f
    private const val CLOSE_MIN_FACE_AREA_RATIO_FOR_EYE_CLASSIFICATION = 0.065
    private const val FAR_MIN_FACE_AREA_RATIO_FOR_EYE_CLASSIFICATION = 0.0
    private const val EMIT_THROTTLE_MS = 350L
    private const val POSTURE_EMIT_THROTTLE_MS = 150L
    private const val DEFAULT_ANALYSIS_WIDTH = 640
    private const val DEFAULT_ANALYSIS_HEIGHT = 480
    private const val MIN_ANALYSIS_WIDTH = 320
    private const val MIN_ANALYSIS_HEIGHT = 240
    private const val MAX_ANALYSIS_WIDTH = 1920
    private const val MAX_ANALYSIS_HEIGHT = 1080
    private const val DEFAULT_FRAME_INTERVAL_MS = 0L
    private const val MIN_FRAME_INTERVAL_MS = 0L
    private const val MAX_FRAME_INTERVAL_MS = 1000L
  }

  private data class WinkThresholds(
    val minEyeOpenProbability: Float,
    val maxWinkEyeOpenProbability: Float,
    val minWinkEyeProbabilityGap: Float,
  )

  private data class LookingAngleThresholds(
    val maxYawDegrees: Double,
    val maxRollDegrees: Double,
  )

  private data class EyeReading(
    val eyeState: String,
    val winkSide: String?,
  )
}
