from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(r"E:\LimProjects\Time")
SRC = Path(r"C:\Users\Lim\Downloads")
OUT = ROOT / "store-assets" / "winktimer-ads-1080x1920"

W, H = 1080, 1920
BG = "#F4F6F1"
INK = "#07130F"
MUTED = "#66736C"
GREEN = "#18563F"
GREEN_2 = "#E7F1EC"
BLUE = "#2E7DDC"
RED = "#A92A20"
CARD = "#FFFFFF"
LINE = "#D5DCD7"

FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
FONT_REG = r"C:\Windows\Fonts\malgun.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size=size)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def shadowed_round_rect(base, box, radius, fill, outline=None, width=1, shadow=True, shadow_alpha=36):
    x1, y1, x2, y2 = box
    if shadow:
        sw, sh = x2 - x1, y2 - y1
        layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(layer)
        sd.rounded_rectangle([x1, y1 + 16, x2, y2 + 16], radius=radius, fill=(0, 0, 0, shadow_alpha))
        layer = layer.filter(ImageFilter.GaussianBlur(18))
        base.alpha_composite(layer)
    d = ImageDraw.Draw(base)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def paste_rounded(base, img, xy, radius):
    img = img.convert("RGBA")
    mask = rounded_mask(img.size, radius)
    base.paste(img, xy, mask)


def fit_image(img, max_w, max_h):
    ratio = min(max_w / img.width, max_h / img.height)
    size = (round(img.width * ratio), round(img.height * ratio))
    return img.resize(size, Image.Resampling.LANCZOS)


def crop_cover(img, w, h):
    ratio = max(w / img.width, h / img.height)
    resized = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.Resampling.LANCZOS)
    x = (resized.width - w) // 2
    y = (resized.height - h) // 2
    return resized.crop((x, y, x + w, y + h))


def phone(base, src_img, center_x, top_y, width, angle=0, border=16):
    img = Image.open(src_img).convert("RGBA")
    inner_w = width - border * 2
    inner_h = round(inner_w * img.height / img.width)
    outer_w = width
    outer_h = inner_h + border * 2
    shot = img.resize((inner_w, inner_h), Image.Resampling.LANCZOS)

    mock = Image.new("RGBA", (outer_w + 64, outer_h + 64), (0, 0, 0, 0))
    x = 32
    y = 32
    shadowed_round_rect(mock, (x, y, x + outer_w, y + outer_h), 48, "#101816", None, shadow=True, shadow_alpha=55)
    d = ImageDraw.Draw(mock)
    d.rounded_rectangle((x, y, x + outer_w, y + outer_h), radius=48, fill="#101816")
    d.rounded_rectangle((x + border, y + border, x + outer_w - border, y + outer_h - border), radius=34, fill="#FFFFFF")
    paste_rounded(mock, shot, (x + border, y + border), 30)

    if angle:
        mock = mock.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    px = round(center_x - mock.width / 2)
    py = top_y
    base.alpha_composite(mock, (px, py))
    return (px, py, px + mock.width, py + mock.height)


def text(draw, xy, value, size, color=INK, bold=False, anchor=None, spacing=10, align="left"):
    draw.multiline_text(xy, value, fill=color, font=font(size, bold), anchor=anchor, spacing=spacing, align=align)


def centered_text(draw, y, value, size, color=INK, bold=False, spacing=10):
    draw.multiline_text((W // 2, y), value, fill=color, font=font(size, bold), anchor="ma", spacing=spacing, align="center")


def pill(draw, xy, value, fill, color, outline=None):
    x, y = xy
    f = font(28, True)
    bbox = draw.textbbox((0, 0), value, font=f)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    box = (x, y, x + tw + 42, y + th + 26)
    draw.rounded_rectangle(box, radius=26, fill=fill, outline=outline, width=2 if outline else 1)
    draw.text((x + 21, y + 12), value, fill=color, font=f)
    return box


def make_canvas(accent=GREEN, secondary=GREEN_2, band="right"):
    img = Image.new("RGBA", (W, H), BG)
    d = ImageDraw.Draw(img)
    if band == "right":
        d.polygon([(760, 0), (1080, 0), (1080, 1920), (900, 1920), (690, 600)], fill=secondary)
    elif band == "bottom":
        d.rectangle((0, 1430, 1080, 1920), fill=secondary)
    elif band == "left":
        d.polygon([(0, 0), (260, 0), (430, 1920), (0, 1920)], fill=secondary)
    else:
        d.rectangle((0, 0, 1080, 330), fill=secondary)
    d.rounded_rectangle((56, 56, 1024, 1864), radius=64, outline=accent, width=5)
    return img


def top_brand(draw, accent=GREEN):
    pill(draw, (76, 86), "WINK TIMER", "#FFFFFF", accent, outline="#D7DED9")


def bottom_caption(draw, title, body, accent=GREEN):
    shadowed_round_rect(canvas_ref, (86, 1634, 994, 1806), 34, "#FFFFFF", "#D9E0DB", width=2, shadow=True, shadow_alpha=25)
    text(draw, (132, 1676), title, 36, accent, True)
    text(draw, (132, 1734), body, 30, MUTED, True, spacing=6)


def save(img, name):
    path = OUT / name
    img.convert("RGB").save(path, quality=95)
    return path


def slide_general():
    global canvas_ref
    canvas = make_canvas(GREEN, "#EAF0EA", "right")
    canvas_ref = canvas
    d = ImageDraw.Draw(canvas)
    top_brand(d, GREEN)
    text(d, (76, 186), "일상 타이머,\n더 똑똑하게", 84, INK, True, spacing=18)
    text(d, (80, 405), "기본 버튼 타이머에 시선, 윙크, 미소 모드를 더했습니다.", 34, MUTED, True)
    phone(canvas, SRC / "모드리스트.png", 540, 545, 650)
    chips = [("BASIC", GREEN), ("LOOK", BLUE), ("WINK", INK), ("SMILE", RED)]
    x = 116
    for label, color in chips:
        box = pill(d, (x, 1518), label, "#FFFFFF", color, outline="#D5DCD7")
        x = box[2] + 18
    bottom_caption(d, "기본 타이머가 먼저", "요리, 운동, 공부, 루틴 어디서나 바로 시작", GREEN)
    return save(canvas, "01-winktimer-general-timer.png")


def slide_look():
    global canvas_ref
    canvas = make_canvas(BLUE, "#EAF3FF", "left")
    canvas_ref = canvas
    d = ImageDraw.Draw(canvas)
    top_brand(d, BLUE)
    text(d, (76, 186), "보면 멈추고\n다른 곳을 보면 재개", 76, INK, True, spacing=18)
    text(d, (80, 397), "LOOK PAUSE", 38, BLUE, True)
    phone(canvas, SRC / "룩모드.png", 540, 505, 690)
    bottom_caption(d, "시선 기반 일시정지", "손대지 않아도 타이머 흐름을 자연스럽게 제어", BLUE)
    return save(canvas, "02-look-pause-ad.png")


def slide_wink():
    global canvas_ref
    canvas = make_canvas(GREEN, "#E9F4EF", "bottom")
    canvas_ref = canvas
    d = ImageDraw.Draw(canvas)
    top_brand(d, GREEN)
    text(d, (76, 186), "손이 바쁠 때\n윙크로 제어", 86, INK, True, spacing=18)
    text(d, (80, 418), "WINK CONTROL", 38, GREEN, True)
    phone(canvas, SRC / "윙크모드.png", 540, 530, 700)
    bottom_caption(d, "오른쪽·왼쪽 윙크 액션", "시작, 일시정지, 재개, 리셋까지 제스처로", GREEN)
    return save(canvas, "03-wink-control-ad.png")


def slide_smile():
    global canvas_ref
    canvas = make_canvas(RED, "#FFF0ED", "right")
    canvas_ref = canvas
    d = ImageDraw.Draw(canvas)
    top_brand(d, RED)
    text(d, (76, 186), "웃으면\n타이머가 다시 움직입니다", 74, INK, True, spacing=18)
    text(d, (80, 420), "SMILE MODE", 38, RED, True)
    phone(canvas, SRC / "스마일모드.png", 540, 535, 700)
    bottom_caption(d, "미소로 재개하는 타이머", "가벼운 표정 인식으로 재미있는 핸즈프리 컨트롤", RED)
    return save(canvas, "04-smile-mode-ad.png")


def slide_settings():
    global canvas_ref
    canvas = make_canvas(GREEN, "#EEF3F0", "top")
    canvas_ref = canvas
    d = ImageDraw.Draw(canvas)
    top_brand(d, GREEN)
    text(d, (76, 186), "언어와 감도까지\n내 방식대로", 84, INK, True, spacing=18)
    text(d, (80, 407), "SETTINGS · LANGUAGE", 36, GREEN, True)

    phone(canvas, SRC / "설정.png", 378, 560, 520, angle=-3)
    phone(canvas, SRC / "나라별언어.png", 720, 620, 492, angle=4)
    bottom_caption(d, "설정은 한 곳에서", "타이머 알림, 카메라 분석, 앱 표시 언어를 조정", GREEN)
    return save(canvas, "05-settings-language-ad.png")


def contact_sheet(paths):
    thumbs = []
    for p in paths:
        img = Image.open(p).convert("RGB")
        img.thumbnail((216, 384), Image.Resampling.LANCZOS)
        thumbs.append(img.copy())
    gap = 16
    sheet = Image.new("RGB", (216 * len(thumbs) + gap * (len(thumbs) + 1), 384 + gap * 2), "#F4F6F1")
    x = gap
    for t in thumbs:
        sheet.paste(t, (x, gap))
        x += 216 + gap
    path = OUT / "00-contact-sheet.png"
    sheet.save(path, quality=95)
    return path


def main():
    paths = [slide_general(), slide_look(), slide_wink(), slide_smile(), slide_settings()]
    sheet = contact_sheet(paths)
    print("Generated:")
    for path in [sheet, *paths]:
        print(path)


if __name__ == "__main__":
    main()
