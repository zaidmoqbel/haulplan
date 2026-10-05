"""Printable planned duty sheets, one letter page for each calendar day."""
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, letter

INK = HexColor("#203d31")
MUTED = HexColor("#657769")
GREEN = HexColor("#247454")
LINE = HexColor("#ccd8cd")


def safe(value, limit=80):
    return str(value or "Not provided").encode("latin-1", "replace").decode("latin-1")[:limit]


def hm(minutes):
    return f"{int(minutes // 60):02d}:{int(minutes % 60):02d}"


def draw_text(c, x, y, value, size=8, color=INK, bold=False):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, safe(value, 110))


def create_logs_pdf(plan):
    stream = BytesIO()
    c = canvas.Canvas(stream, pagesize=landscape(letter))
    c.setTitle("Haulplan planned daily duty logs")
    c.setAuthor("Haulplan")
    for index, day in enumerate(plan["days"]):
        draw_text(c, 36, 573, "HAULPLAN / PLANNED DUTY RECORD", 8, MUTED, True)
        draw_text(c, 36, 548, "Driver's daily log", 20, INK, True)
        draw_text(c, 36, 530, f"{day['date']}  |  Sheet {index + 1} of {len(plan['days'])}  |  {safe(plan['input'].get('clock', 'Home-terminal time'), 45)}", 9, MUTED)
        c.setStrokeColor(INK); c.setLineWidth(1.3); c.line(36, 517, 756, 517)

        fields = [("DRIVER", plan["input"].get("driver")), ("CARRIER", plan["input"].get("carrier")),
                  ("MILES TODAY", f"{day['miles']:.1f} mi"), ("VEHICLE / TRAILER", plan["input"].get("vehicle")),
                  ("OFFICE / HOME TERMINAL", plan["input"].get("office")),
                  ("SHIPPING DOCUMENT", plan["input"].get("shipping"))]
        for n, (label, value) in enumerate(fields):
            x = 36 + (n % 3) * 244
            y = 496 - (n // 3) * 34
            draw_text(c, x, y, label, 7, MUTED, True)
            draw_text(c, x, y - 12, safe(value, 35), 9)
            c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(x, y - 16, x + 221, y - 16)

        draw_text(c, 36, 416, f"From: {safe(plan['places'][0]['name'], 80)}", 8)
        draw_text(c, 36, 402, f"To: {safe(plan['places'][2]['name'], 80)}", 8)
        x0, x1, top, row_h = 133, 682, 376, 31
        row_names = [("off_duty", "1. Off duty"), ("sleeper", "2. Sleeper berth"),
                     ("driving", "3. Driving"), ("on_duty", "4. On duty")]
        for hour in range(25):
            x = x0 + (x1 - x0) * hour / 24
            draw_text(c, x - 6, top + 11, "Mid" if hour in (0, 24) else "Noon" if hour == 12 else str(hour), 5.5, MUTED)
            c.setStrokeColor(LINE); c.setLineWidth(.6 if hour % 6 else 1)
            c.line(x, top - row_h * 4, x, top)
        for n, (status, label) in enumerate(row_names):
            y = top - n * row_h
            draw_text(c, 36, y - 18, label, 8)
            draw_text(c, 702, y - 18, hm(day["totals"][status]), 8, INK, True)
            c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(x0, y, x1, y)
        c.line(x0, top - row_h * 4, x1, top - row_h * 4)
        c.setStrokeColor(GREEN); c.setLineWidth(2)
        previous_y = None
        for segment in day["segments"]:
            y = top - (row_names.index(next(r for r in row_names if r[0] == segment["status"])) + .5) * row_h
            a = x0 + (x1 - x0) * segment["start"] / 1440
            b = x0 + (x1 - x0) * segment["end"] / 1440
            if previous_y is not None and previous_y != y:
                c.line(a, previous_y, a, y)
            c.line(a, y, b, y)
            previous_y = y
        draw_text(c, 36, 230, "REMARKS & DUTY CHANGES", 8, INK, True)
        c.setStrokeColor(LINE); c.setLineWidth(.5); c.line(36, 222, 756, 222)
        entries = day["segments"]
        for n, event in enumerate(entries[:12]):
            y = 209 - 12 * n
            draw_text(c, 36, y, f"{hm(event['start'])}-{hm(event['end'])}", 7, MUTED)
            draw_text(c, 102, y, safe(event["label"], 29), 7)
            draw_text(c, 280, y, safe(event["location"], 75), 7)
        if len(entries) > 12:
            draw_text(c, 36, 57, f"{len(entries) - 12} additional changes in digital export.", 7, MUTED)
        draw_text(c, 36, 47, f"On duty today: {hm(day['totals']['driving'] + day['totals']['on_duty'])}    Total: 24:00", 8, INK, True)
        draw_text(c, 485, 47, "Driver certification: ____________________", 8)
        draw_text(c, 36, 28, "Planning draft. Verify actual times, city/state remarks, miles and signature. Not a certified ELD record.", 7, MUTED)
        c.showPage()
    c.save()
    stream.seek(0)
    return stream
