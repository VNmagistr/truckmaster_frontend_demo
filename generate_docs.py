#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TruckMaster CRM — генератор PDF-документації.
Запуск: python generate_docs.py
Результат: TruckMaster_Documentation.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, ListFlowable, ListItem, KeepTogether,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, NextPageTemplate
from reportlab.platypus.doctemplate import IndexingFlowable
import os, sys

# ── Шрифти з підтримкою кирилиці ─────────────────────────────────────────────
def register_fonts():
    """Реєструємо шрифти з підтримкою кирилиці. Пробуємо DejaVu → Arial → Helvetica."""
    font_dirs = [
        r"C:\Windows\Fonts",
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/truetype/liberation",
        os.path.expanduser("~/.fonts"),
    ]
    # (name, normal, bold, italic, bold-italic)
    families = [
        ("DejaVu", "DejaVuSans.ttf", "DejaVuSans-Bold.ttf",
         "DejaVuSans-Oblique.ttf", "DejaVuSans-BoldOblique.ttf"),
        ("Arial", "arial.ttf", "arialbd.ttf", "ariali.ttf", "arialbi.ttf"),
    ]
    for family, fn, fb, fi, fbi in families:
        for d in font_dirs:
            if os.path.exists(os.path.join(d, fn)):
                try:
                    pdfmetrics.registerFont(TTFont(f"{family}",       os.path.join(d, fn)))
                    pdfmetrics.registerFont(TTFont(f"{family}-Bold",  os.path.join(d, fb)))
                    pdfmetrics.registerFont(TTFont(f"{family}-Italic",os.path.join(d, fi)))
                    pdfmetrics.registerFont(TTFont(f"{family}-BoldItalic", os.path.join(d, fbi)))
                    from reportlab.pdfbase.pdfmetrics import registerFontFamily
                    registerFontFamily(family,
                        normal=family, bold=f"{family}-Bold",
                        italic=f"{family}-Italic", boldItalic=f"{family}-BoldItalic")
                    return family
                except Exception:
                    pass
    return None

_FONT_FAMILY = register_fonts()
FONT_NORMAL = _FONT_FAMILY if _FONT_FAMILY else "Helvetica"
FONT_BOLD   = f"{_FONT_FAMILY}-Bold"   if _FONT_FAMILY else "Helvetica-Bold"
FONT_ITALIC = f"{_FONT_FAMILY}-Italic" if _FONT_FAMILY else "Helvetica-Oblique"

# ── Кольори бренду ──────────────────────────────────────────────────────────
C_PRIMARY   = colors.HexColor("#1677FF")   # Ant Design blue
C_DARK      = colors.HexColor("#0A1628")
C_GRAY      = colors.HexColor("#6B7280")
C_LIGHT     = colors.HexColor("#F3F4F6")
C_BORDER    = colors.HexColor("#E5E7EB")
C_WARNING   = colors.HexColor("#F59E0B")
C_SUCCESS   = colors.HexColor("#10B981")
C_DANGER    = colors.HexColor("#EF4444")
C_CODE_BG   = colors.HexColor("#F8F9FA")

# ── Стилі ───────────────────────────────────────────────────────────────────
def build_styles():
    s = {}
    base = getSampleStyleSheet()

    def ps(name, **kw):
        kw.setdefault("fontName", FONT_NORMAL)
        return ParagraphStyle(name, **kw)

    s["cover_title"] = ps("cover_title",
        fontName=FONT_BOLD, fontSize=36, textColor=colors.white,
        spaceAfter=8, alignment=TA_CENTER, leading=44)
    s["cover_subtitle"] = ps("cover_subtitle",
        fontSize=16, textColor=colors.HexColor("#BFD7FF"),
        alignment=TA_CENTER, spaceAfter=6, leading=22)
    s["cover_version"] = ps("cover_version",
        fontSize=12, textColor=colors.HexColor("#93C5FD"),
        alignment=TA_CENTER)

    s["h1"] = ps("h1",
        fontName=FONT_BOLD, fontSize=20, textColor=C_PRIMARY,
        spaceBefore=20, spaceAfter=10, leading=26,
        borderPad=(0,0,4,0))
    s["h2"] = ps("h2",
        fontName=FONT_BOLD, fontSize=15, textColor=C_DARK,
        spaceBefore=14, spaceAfter=6, leading=20)
    s["h3"] = ps("h3",
        fontName=FONT_BOLD, fontSize=12, textColor=C_DARK,
        spaceBefore=10, spaceAfter=4, leading=16)
    s["h4"] = ps("h4",
        fontName=FONT_BOLD, fontSize=10.5, textColor=C_GRAY,
        spaceBefore=8, spaceAfter=3)

    s["body"] = ps("body",
        fontSize=10, textColor=C_DARK, spaceAfter=5,
        leading=15, alignment=TA_JUSTIFY)
    s["body_left"] = ps("body_left",
        fontSize=10, textColor=C_DARK, spaceAfter=5, leading=15)
    s["note"] = ps("note",
        fontSize=9, textColor=C_GRAY, spaceAfter=4, leading=13,
        leftIndent=12, fontName=FONT_ITALIC)
    s["code"] = ps("code",
        fontName="Courier", fontSize=8.5, textColor=C_DARK,
        backColor=C_CODE_BG, leftIndent=10, rightIndent=10,
        spaceAfter=4, leading=13, borderColor=C_BORDER,
        borderWidth=0.5, borderPad=6)
    s["bullet"] = ps("bullet",
        fontSize=10, textColor=C_DARK, leading=15,
        leftIndent=16, spaceAfter=3,
        bulletIndent=4, bulletFontName=FONT_NORMAL)
    s["toc1"] = ps("toc1",
        fontName=FONT_BOLD, fontSize=11, textColor=C_DARK,
        spaceAfter=4, leftIndent=0)
    s["toc2"] = ps("toc2",
        fontSize=10, textColor=C_GRAY, spaceAfter=2, leftIndent=14)
    s["footer"] = ps("footer",
        fontSize=8, textColor=C_GRAY, alignment=TA_CENTER)
    s["table_header"] = ps("table_header",
        fontName=FONT_BOLD, fontSize=9, textColor=colors.white,
        alignment=TA_CENTER, leading=12)
    s["table_cell"] = ps("table_cell",
        fontSize=9, textColor=C_DARK, leading=13)
    s["table_cell_center"] = ps("table_cell_center",
        fontSize=9, textColor=C_DARK, alignment=TA_CENTER, leading=13)
    s["warn_box"] = ps("warn_box",
        fontSize=9.5, textColor=colors.HexColor("#92400E"),
        backColor=colors.HexColor("#FEF3C7"),
        leftIndent=8, rightIndent=8, spaceAfter=6, leading=14,
        borderColor=C_WARNING, borderWidth=1, borderPad=8)
    s["info_box"] = ps("info_box",
        fontSize=9.5, textColor=colors.HexColor("#1E40AF"),
        backColor=colors.HexColor("#EFF6FF"),
        leftIndent=8, rightIndent=8, spaceAfter=6, leading=14,
        borderColor=C_PRIMARY, borderWidth=1, borderPad=8)
    return s

# ── Хелпери ─────────────────────────────────────────────────────────────────
def hr(color=C_BORDER, thickness=0.5, space=6):
    return HRFlowable(width="100%", thickness=thickness,
                      color=color, spaceAfter=space, spaceBefore=space)

def spacer(h=0.3):
    return Spacer(1, h * cm)

def bullet_list(items, style, bullet="•"):
    return [Paragraph(f"<b>{bullet}</b>  {item}", style) for item in items]

def kv_table(rows, s, col_widths=(5*cm, 11.5*cm)):
    """Таблиця «Поле — Значення»."""
    data = []
    for k, v in rows:
        data.append([
            Paragraph(f"<b>{k}</b>", s["table_cell"]),
            Paragraph(v, s["table_cell"]),
        ])
    t = Table(data, colWidths=col_widths, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), C_LIGHT),
        ("BOX",        (0,0), (-1,-1), 0.5, C_BORDER),
        ("INNERGRID",  (0,0), (-1,-1), 0.3, C_BORDER),
        ("VALIGN",     (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0),(-1,-1), 5),
        ("LEFTPADDING",(0,0), (-1,-1), 8),
    ]))
    return t

def std_table(headers, rows, s, col_widths=None):
    """Стандартна таблиця з заголовком."""
    header_row = [Paragraph(h, s["table_header"]) for h in headers]
    body_rows  = [[Paragraph(str(c), s["table_cell"]) for c in r] for r in rows]
    data = [header_row] + body_rows
    if col_widths is None:
        w = 16.5 / len(headers)
        col_widths = [w * cm] * len(headers)
    t = Table(data, colWidths=col_widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  C_PRIMARY),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, C_LIGHT]),
        ("BOX",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("INNERGRID",    (0,0), (-1,-1), 0.3, C_BORDER),
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
    ]))
    return t

# ── Шаблон сторінки ─────────────────────────────────────────────────────────
class DocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        BaseDocTemplate.__init__(self, filename, **kw)
        margin = 2*cm
        body_frame = Frame(margin, 2.5*cm, A4[0]-2*margin, A4[1]-3.5*cm,
                           id="normal", leftPadding=0, rightPadding=0,
                           topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[body_frame],
                         onPage=self._cover_page),
            PageTemplate(id="normal", frames=[body_frame],
                         onPage=self._normal_page),
        ])

    def _cover_page(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C_PRIMARY)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Gradient strip
        canvas.setFillColor(colors.HexColor("#0050CC"))
        canvas.rect(0, 0, A4[0], 6*cm, fill=1, stroke=0)
        canvas.restoreState()

    def _normal_page(self, canvas, doc):
        canvas.saveState()
        # Header line
        canvas.setStrokeColor(C_PRIMARY)
        canvas.setLineWidth(2)
        canvas.line(2*cm, A4[1]-1.8*cm, A4[0]-2*cm, A4[1]-1.8*cm)
        # Header text
        canvas.setFont(FONT_BOLD, 8)
        canvas.setFillColor(C_PRIMARY)
        canvas.drawString(2*cm, A4[1]-1.5*cm, "TruckMaster CRM")
        canvas.setFont(FONT_NORMAL, 8)
        canvas.setFillColor(C_GRAY)
        canvas.drawRightString(A4[0]-2*cm, A4[1]-1.5*cm, "Документація та інструкція користувача")
        # Footer
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 2.1*cm, A4[0]-2*cm, 2.1*cm)
        canvas.setFont(FONT_NORMAL, 8)
        canvas.setFillColor(C_GRAY)
        canvas.drawString(2*cm, 1.6*cm, "TruckMaster CRM © 2026")
        canvas.drawRightString(A4[0]-2*cm, 1.6*cm, f"Стор. {doc.page}")
        canvas.restoreState()

# ── ВМІСТ ────────────────────────────────────────────────────────────────────
def build_content(s):
    story = []

    # ════════════════════════════════════════════════════════
    # ОБКЛАДИНКА
    # ════════════════════════════════════════════════════════
    story.append(NextPageTemplate("cover"))
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph("🚛 TruckMaster CRM", s["cover_title"]))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph("Документація та інструкція користувача", s["cover_subtitle"]))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Версія 1.0  •  Березень 2026", s["cover_version"]))
    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph(
        "CRM-система для сервісного центру вантажних автомобілів IVECO.<br/>"
        "Облік клієнтів, автомобілів, наряд-замовлень та складу запчастин.",
        ParagraphStyle("cover_desc", fontName=FONT_NORMAL, fontSize=13,
                       textColor=colors.HexColor("#DBEAFE"), alignment=TA_CENTER,
                       leading=20)))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # ЗМІСТ
    # ════════════════════════════════════════════════════════
    story.append(NextPageTemplate("normal"))
    story.append(Paragraph("Зміст", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    toc_entries = [
        ("1. Загальний огляд системи", ""),
        ("2. Початок роботи — вхід до системи", ""),
        ("3. Навігація та головна панель", ""),
        ("4. Розділ «Клієнти»", ""),
        ("   4.1  Список клієнтів", ""),
        ("   4.2  Картка клієнта", ""),
        ("   4.3  Додавання та редагування клієнта", ""),
        ("5. Розділ «Вантажівки»", ""),
        ("   5.1  Список вантажівок", ""),
        ("   5.2  Картка вантажівки", ""),
        ("   5.3  Комплект ТО та інтервали", ""),
        ("   5.4  Додавання та редагування вантажівки", ""),
        ("6. Розділ «Замовлення»", ""),
        ("   6.1  Список замовлень", ""),
        ("   6.2  Статуси замовлень", ""),
        ("   6.3  Деталі замовлення", ""),
        ("   6.4  Роботи та запчастини", ""),
        ("   6.5  Фото ремонту", ""),
        ("   6.6  Запит на видалення", ""),
        ("7. Розділ «Склад»", ""),
        ("   7.1  Список товарів", ""),
        ("   7.2  Картка товару", ""),
        ("   7.3  Додавання та редагування товару", ""),
        ("8. Telegram-бот (моніторинг)", ""),
        ("9. Профіль користувача", ""),
        ("10. Технічна документація", ""),
        ("   10.1  Стек технологій", ""),
        ("   10.2  Структура проєкту", ""),
        ("   10.3  API-шар", ""),
        ("   10.4  Автентифікація", ""),
        ("   10.5  Константи та формати", ""),
        ("   10.6  Розгортання", ""),
        ("11. Відомі обмеження та плани", ""),
    ]
    for entry, _ in toc_entries:
        indent = 0 if not entry.startswith("   ") else 1.2*cm
        size = 10 if indent == 0 else 9
        color = C_DARK if indent == 0 else C_GRAY
        font = FONT_BOLD if indent == 0 else FONT_NORMAL
        story.append(Paragraph(entry.strip(), ParagraphStyle(
            "toc_e", fontName=font, fontSize=size, textColor=color,
            spaceAfter=3, leftIndent=indent)))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 1. ЗАГАЛЬНИЙ ОГЛЯД
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("1. Загальний огляд системи", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "TruckMaster CRM — це веб-застосунок для управління сервісним центром вантажних автомобілів IVECO. "
        "Система дозволяє вести повний цикл обліку: від реєстрації клієнта до закриття наряду-замовлення, "
        "включаючи управління складом запчастин та технічним обслуговуванням.",
        s["body"]))
    story.append(spacer(0.3))

    story.append(Paragraph("Основні можливості", s["h2"]))
    features = [
        "<b>Клієнти</b> — база клієнтів із контактними даними, прив'язкою до Telegram та переглядом їхніх автомобілів і замовлень.",
        "<b>Вантажівки</b> — реєстр автомобілів із VIN, євростандартом, комплектом ТО та інтервалами технічного обслуговування.",
        "<b>Замовлення</b> — наряди-замовлення з переліком робіт, витраченими запчастинами, фотографіями та відстеженням статусів.",
        "<b>Склад</b> — каталог запчастин і витратних матеріалів із залишками, рухами та контролем мінімального запасу.",
        "<b>Дашборд</b> — зведена статистика: кількість клієнтів, авто, замовлень та динаміка за тиждень.",
        "<b>Telegram-бот</b> — моніторинг взаємодії клієнтів з ботом (в розробці).",
        "<b>Профіль</b> — особисті налаштування, зміна паролю та безпека облікового запису.",
    ]
    for f in features:
        story.append(Paragraph(f"• {f}", s["bullet"]))
    story.append(spacer())

    story.append(Paragraph("Ключові принципи роботи", s["h2"]))
    principles = [
        ("М'яке видалення", "Записи не видаляються одразу. Вони позначаються для видалення, адміністратор перевіряє та приймає рішення."),
        ("Стан замовлень", "Кожне замовлення проходить ланцюжок статусів: Відкрито → В роботі → Виконано → Закрито. Всі переходи зберігаються в Історії статусів."),
        ("Контроль ТО", "При введенні пробігу система порівнює його з інтервалами ТО та попереджає про необхідне обслуговування."),
        ("Soft-lock клієнта", "У замовленні: після вибору автомобіля поле «Клієнт» блокується автоматично для уникнення помилок."),
    ]
    story.append(kv_table(principles, s))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 2. ВХІД ДО СИСТЕМИ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("2. Початок роботи — вхід до системи", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Щоб почати роботу з TruckMaster CRM, відкрийте браузер та перейдіть за адресою сервера. "
        "Ви побачите стартову сторінку з кнопкою «Увійти».",
        s["body"]))
    story.append(spacer(0.2))

    story.append(Paragraph("Кроки входу", s["h2"]))
    steps = [
        "Відкрийте стартову сторінку та натисніть кнопку <b>«Увійти»</b>.",
        "На сторінці входу введіть свій <b>логін</b> (username) та <b>пароль</b>.",
        "Натисніть кнопку <b>«Увійти»</b>.",
        "Після успішної автентифікації ви потрапите на <b>Головну панель (Dashboard)</b>.",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", s["bullet"]))
    story.append(spacer(0.3))

    story.append(Paragraph(
        "⚠️  Якщо ви бачите повідомлення «Невірний логін або пароль» — "
        "перевірте правильність введених даних. Зверніться до адміністратора для отримання облікових даних.",
        s["warn_box"]))
    story.append(spacer(0.2))

    story.append(Paragraph("Вихід із системи", s["h2"]))
    story.append(Paragraph(
        "Натисніть на іконку користувача у верхньому правому куті → оберіть <b>«Вийти»</b>. "
        "Сесія завершиться, і ви повернетесь на стартову сторінку.",
        s["body"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 3. НАВІГАЦІЯ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("3. Навігація та головна панель", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))

    story.append(Paragraph("Бічне меню", s["h2"]))
    story.append(Paragraph(
        "Основна навігація знаходиться у бічній панелі ліворуч. "
        "Панель можна згортати (натиснувши стрілку або гамбургер-кнопку) для більшого простору.",
        s["body"]))
    nav_rows = [
        ("Головна",         "Дашборд зі статистикою та останніми замовленнями"),
        ("Клієнти",         "Реєстр клієнтів сервісного центру"),
        ("Вантажівки",      "Перелік зареєстрованих вантажних автомобілів"),
        ("Замовлення",      "Наряди-замовлення на ремонт та обслуговування"),
        ("Склад",           "Каталог запчастин і витратних матеріалів"),
        ("Telegram бот",    "Перегляд активності Telegram-бота (в розробці)"),
    ]
    story.append(std_table(["Пункт меню", "Призначення"], nav_rows, s,
                           col_widths=[5*cm, 11.5*cm]))
    story.append(spacer(0.4))

    story.append(Paragraph("Головна панель (Dashboard)", s["h2"]))
    story.append(Paragraph(
        "Після входу ви потрапляєте на головну панель. Тут відображається:",
        s["body"]))
    dash_items = [
        "<b>Лічильники</b> — загальна кількість клієнтів, вантажівок та замовлень. Натискання на картку переходить до відповідного розділу.",
        "<b>Графік замовлень</b> — динаміка кількості замовлень за тиждень.",
        "<b>Останні замовлення</b> — таблиця з 5 найновіших замовлень із посиланням «Всі» для переходу до повного списку.",
    ]
    for item in dash_items:
        story.append(Paragraph(f"• {item}", s["bullet"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 4. КЛІЄНТИ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("4. Розділ «Клієнти»", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Розділ «Клієнти» дозволяє зберігати та управляти інформацією про фізичних осіб або компанії, "
        "які звертаються до сервісного центру.",
        s["body"]))

    story.append(Paragraph("4.1  Список клієнтів", s["h2"]))
    story.append(Paragraph(
        "Перелік всіх клієнтів відображається у таблиці. Колонки:",
        s["body"]))
    client_cols = [
        ("Ім'я / Назва", "Повне ім'я фізичної особи або назва компанії"),
        ("Телефон",       "Номер телефону у форматі +38 (0XX) XXX-XX-XX"),
        ("Email",         "Адреса електронної пошти"),
        ("Дії",           "Кнопки: Перегляд (👁), Редагувати (✏), Видалити (🗑)"),
    ]
    story.append(std_table(["Колонка", "Опис"], client_cols, s,
                           col_widths=[4*cm, 12.5*cm]))
    story.append(spacer(0.3))
    story.append(Paragraph(
        "💡 Пошук: введіть ім'я, телефон або email у рядок пошуку — результати оновляться автоматично (з затримкою 0.6 с).",
        s["info_box"]))
    story.append(Paragraph(
        "Натисніть на будь-який рядок таблиці, щоб перейти на картку клієнта. "
        "Кнопка <b>«+ Новий клієнт»</b> у правому верхньому куті відкриває форму створення.",
        s["body"]))

    story.append(Paragraph("4.2  Картка клієнта", s["h2"]))
    story.append(Paragraph(
        "Картка клієнта містить дві вкладки:",
        s["body"]))
    story.append(Paragraph("• <b>Вантажівки</b> — список автомобілів, зареєстрованих на цього клієнта "
                            "(номерний знак, модель, VIN, євростандарт). Натискання на номер відкриває картку авто.",
                            s["bullet"]))
    story.append(Paragraph("• <b>Замовлення</b> — список замовлень клієнта із статусом та сумою. "
                            "Показуються останні 20 замовлень; загальна кількість відображається на вкладці.",
                            s["bullet"]))
    story.append(Paragraph(
        "Контактна інформація клієнта відображається у блоці зверху: телефон, email, адреса та статус Telegram-бота.",
        s["body"]))

    story.append(Paragraph("4.3  Додавання та редагування клієнта", s["h2"]))
    client_fields = [
        ("Ім'я / Назва компанії *", "Обов'язкове поле. Ім'я фізичної особи або назва юридичної особи."),
        ("Телефон",                  "Необов'язкове. Формат +380XXXXXXXXX. Перевіряється на допустимі символи."),
        ("Email",                    "Необов'язкове. Перевіряється формат email-адреси."),
        ("Адреса",                   "Необов'язкове. Текстове поле (кілька рядків)."),
    ]
    story.append(kv_table(client_fields, s, (5.5*cm, 11*cm)))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "Поля, позначені *, є обов'язковими. Кнопка «Зберегти» зберігає запис та повертає до списку. "
        "«Скасувати» відмовляється від змін.",
        s["note"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 5. ВАНТАЖІВКИ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("5. Розділ «Вантажівки»", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Розділ містить повний реєстр вантажних автомобілів, що обслуговуються в сервісному центрі. "
        "Кожне авто прив'язане до клієнта-власника.",
        s["body"]))

    story.append(Paragraph("5.1  Список вантажівок", s["h2"]))
    truck_cols = [
        ("Номерний знак", "Реєстраційний номер автомобіля"),
        ("Модель",        "Уточнена модель (наприклад: 35C15, 70C17)"),
        ("VIN (останні 7)", "Останні 7 символів повного VIN-коду"),
        ("Клієнт",        "Ім'я власника (посилання на картку клієнта)"),
        ("Дії",           "Перегляд, Редагувати, Видалити"),
    ]
    story.append(std_table(["Колонка", "Опис"], truck_cols, s,
                           col_widths=[4.5*cm, 12*cm]))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "💡 Пошук: за номерним знаком, VIN або моделлю. Кнопка «+ Додати авто» створює новий запис.",
        s["info_box"]))

    story.append(Paragraph("5.2  Картка вантажівки", s["h2"]))
    story.append(Paragraph(
        "На картці вантажівки відображається вся технічна інформація та чотири вкладки:",
        s["body"]))
    truck_tabs = [
        ("Історія замовлень",      "Всі наряди-замовлення для цього авто зі статусами та датами."),
        ("Історія ТО",             "Журнал виконаних технічних обслуговувань: дата, тип ТО, пробіг."),
        ("Комплект ТО",            "Налаштування оливи та фільтрів для цього авто (для автозаповнення замовлень)."),
        ("Інтервали регламенту",   "Пробіг/дата останньої заміни та інтервал для кожного виду обслуговування."),
    ]
    story.append(kv_table(truck_tabs, s))

    story.append(Paragraph("5.3  Комплект ТО та інтервали", s["h2"]))
    story.append(Paragraph(
        "Вкладка <b>«Комплект ТО»</b> дозволяє задати стандартний набір матеріалів для планового обслуговування:",
        s["body"]))
    kit_items = [
        "<b>Олива</b> — оберіть товар зі складу, вкажіть кількість (літри) та інтервал заміни (км).",
        "<b>Фільтри</b> — додайте будь-яку кількість фільтрів з кількістю та інтервалом. Видалити фільтр можна натиснувши іконку 🗑 у рядку.",
    ]
    for item in kit_items:
        story.append(Paragraph(f"• {item}", s["bullet"]))
    story.append(Paragraph(
        "Вкладка <b>«Інтервали регламенту»</b> — задайте інтервали (км) та пробіг останньої заміни для: "
        "оливи двигуна, оливи КПП/АКПП, оливи заднього моста, ременів/роликів та ланцюгів. "
        "Натисніть «Зберегти» для підтвердження змін.",
        s["body"]))

    story.append(Paragraph("5.4  Додавання та редагування вантажівки", s["h2"]))
    truck_fields = [
        ("Номерний знак *",    "Реєстраційний номер. Автоматично конвертується у верхній регістр. Приклад: AA0000BB."),
        ("Повний VIN-код *",   "Рівно 17 символів. Перевіряється довжина. Верхній регістр."),
        ("Модель (уточнення) *","Конкретна комерційна назва моделі. Приклад: 35C15, 70C17."),
        ("Базова модель",       "Вибір зі списку базових моделей (необов'язково)."),
        ("Євростандарт",        "Вибір: Євро-3, Євро-4, Євро-5, Євро-6."),
        ("Власник",             "Вибір клієнта зі списку (пошук за іменем). Необов'язково."),
    ]
    story.append(kv_table(truck_fields, s, (5.5*cm, 11*cm)))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 6. ЗАМОВЛЕННЯ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("6. Розділ «Замовлення»", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Замовлення (наряди) — центральна сутність системи. "
        "Тут реєструються всі роботи з ремонту та обслуговування транспортних засобів.",
        s["body"]))

    story.append(Paragraph("6.1  Список замовлень", s["h2"]))
    story.append(Paragraph(
        "Замовлення відображаються у зворотньому хронологічному порядку та <b>групуються за датою</b> — "
        "між днями вставляється розділювальний рядок із датою та кількістю замовлень за цей день.",
        s["body"]))
    story.append(spacer(0.2))

    story.append(Paragraph("Фільтри списку:", s["h3"]))
    filter_rows = [
        ("Пошук",                  "Пошук за номером замовлення, номером авто або ім'ям клієнта."),
        ("Статус",                 "Фільтрація за статусом: Відкрито, В роботі, Виконано, Закрито, Скасовано."),
        ("На видалення",           "Перемикач для відображення замовлень, що очікують видалення адміністратором."),
        ("Статистика (верхній блок)", "Показує кількість замовлень: сьогодні / тиждень / місяць / рік."),
    ]
    story.append(kv_table(filter_rows, s))
    story.append(spacer(0.3))

    story.append(Paragraph("Таблиця замовлень:", s["h3"]))
    order_cols = [
        ("Номер",    "Унікальний номер замовлення. Якщо позначено на видалення — показується тег «На видалення»."),
        ("Авто",     "Номерний знак (жирний) та модель авто."),
        ("Клієнт",   "Ім'я клієнта."),
        ("Статус",   "Кольоровий тег статусу."),
        ("Сума",     "Загальна вартість замовлення в гривнях."),
        ("Створено", "Дата створення."),
        ("Дії",      "Редагувати (✏) | Видалити (🗑) або Відновити (↩) якщо позначено на видалення."),
    ]
    story.append(std_table(["Колонка", "Опис"], order_cols, s,
                           col_widths=[3*cm, 13.5*cm]))

    story.append(Paragraph("6.2  Статуси замовлень", s["h2"]))
    story.append(Paragraph(
        "Кожне замовлення має один зі статусів. Переходи між статусами відстежуються в Історії статусів.",
        s["body"]))
    status_rows = [
        ("Відкрито",   "Синій",    "Замовлення щойно створено, роботи ще не розпочаті."),
        ("В роботі",   "Помаранч.", "Ремонт або обслуговування виконується."),
        ("Виконано",   "Блакитний","Роботи виконані, замовлення готове до видачі."),
        ("Закрито",    "Зелений",  "Авто передано клієнту, оплата проведена."),
        ("Скасовано",  "Червоний", "Замовлення скасовано."),
    ]
    t = Table(
        [["Статус", "Колір", "Опис"]] +
        [[Paragraph(r, s["table_cell"]) for r in row] for row in status_rows],
        colWidths=[3.5*cm, 3.5*cm, 9.5*cm], hAlign="LEFT", repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0),  C_PRIMARY),
        ("FONTNAME",     (0,0), (-1,0),  FONT_BOLD),
        ("FONTSIZE",     (0,0), (-1,0),  9),
        ("TEXTCOLOR",    (0,0), (-1,0),  colors.white),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [colors.white, C_LIGHT]),
        ("BOX",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("INNERGRID",    (0,0), (-1,-1), 0.3, C_BORDER),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
        ("LEFTPADDING",  (0,0), (-1,-1), 6),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(spacer(0.3))

    story.append(Paragraph("6.3  Деталі замовлення", s["h2"]))
    story.append(Paragraph(
        "Картка замовлення містить п'ять вкладок:",
        s["body"]))
    order_tabs = [
        ("Основна інформація", "Опис проблеми та рекомендації. Підтримується вбудоване редагування (кнопка «Редагувати» → TextArea → «Зберегти»)."),
        ("Роботи",             "Перелік виконаних робіт із вартістю, призначеним механіком та витраченими запчастинами."),
        ("Фото ремонту",       "Фотографії з описом, завантажені під час або після ремонту."),
        ("Обслуговування",     "Інформація про наступне планове ТО (лічильник на основі пробігу/дати)."),
        ("Історія статусів",   "Журнал усіх змін статусу: хто змінив, на який статус та коли."),
    ]
    story.append(kv_table(order_tabs, s))

    story.append(Paragraph("6.4  Роботи та запчастини", s["h2"]))
    story.append(Paragraph(
        "На вкладці <b>«Роботи»</b> ведеться облік виконаних робіт та використаних матеріалів.",
        s["body"]))
    story.append(Paragraph("<b>Додавання роботи:</b>", s["h3"]))
    work_steps = [
        "Натисніть кнопку <b>«Додати роботу»</b> у вкладці «Роботи».",
        "Оберіть роботу з довідника або введіть назву вручну.",
        "Вкажіть вартість і призначте механіка.",
        "Збережіть — робота з'явиться в таблиці.",
    ]
    for i, step in enumerate(work_steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", s["bullet"]))
    story.append(spacer(0.2))
    story.append(Paragraph("<b>Додавання запчастин до роботи:</b>", s["h3"]))
    parts_steps = [
        "У рядку роботи натисніть кнопку <b>«Додати запчастини»</b>.",
        "Оберіть товар зі складу та вкажіть кількість.",
        "Запчастини відображаються під рядком роботи.",
    ]
    for i, step in enumerate(parts_steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", s["bullet"]))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "💡 Застосування комплекту ТО: якщо для авто налаштовано Комплект ТО, "
        "натисніть «Застосувати комплект» — система автоматично додасть всі потрібні роботи та матеріали.",
        s["info_box"]))

    story.append(Paragraph("6.5  Фото ремонту", s["h2"]))
    story.append(Paragraph(
        "Вкладка <b>«Фото ремонту»</b> дозволяє зберігати фотографії, зроблені під час обслуговування.",
        s["body"]))
    photo_steps = [
        "Натисніть кнопку <b>«Завантажити фото»</b>.",
        "Оберіть файл або перетягніть його у область завантаження.",
        "Додайте опис фотографії (необов'язково).",
        "Натисніть «Зберегти».",
    ]
    for i, step in enumerate(photo_steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", s["bullet"]))
    story.append(Paragraph(
        "Для видалення фото натисніть іконку 🗑 навпроти відповідного запису.",
        s["body"]))

    story.append(Paragraph("6.6  Запит на видалення замовлення", s["h2"]))
    story.append(Paragraph(
        "Користувачі не можуть видаляти замовлення безпосередньо. Замість цього існує механізм м'якого видалення:",
        s["body"]))
    del_steps = [
        "Натисніть іконку 🗑 у рядку замовлення.",
        "У діалоговому вікні введіть <b>причину видалення</b> (обов'язкове поле).",
        "Натисніть «Підтвердити» — замовлення позначається як «На видалення» і виділяється червоним.",
        "Адміністратор перевіряє запит та виконує остаточне видалення.",
        "Для скасування запиту натисніть іконку ↩ (Відновити).",
    ]
    for i, step in enumerate(del_steps, 1):
        story.append(Paragraph(f"<b>{i}.</b>  {step}", s["bullet"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 7. СКЛАД
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("7. Розділ «Склад»", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Розділ «Склад» забезпечує облік запчастин та витратних матеріалів: "
        "залишки, рухи (прихід/видаток), мінімальні запаси та контроль низького рівня.",
        s["body"]))

    story.append(Paragraph("7.1  Список товарів", s["h2"]))
    story.append(Paragraph(
        "Список має дві вкладки: <b>«Всі товари»</b> та <b>«Мало на складі»</b> (товари нижче мінімального залишку).",
        s["body"]))
    inv_cols = [
        ("Назва / SKU", "Назва товару та артикул (SKU-код)."),
        ("Категорія",   "Група товарів (Оливи, Фільтри, Рідини, тощо)."),
        ("Підкатегорія","Деталізована категорія."),
        ("Ціна",        "Ціна одиниці товару в гривнях."),
        ("Залишок",     "Поточна кількість на складі з одиницею виміру."),
        ("Статус",      "Тег «Мало» якщо залишок нижче мінімуму; тег «Видалений» якщо товар позначений."),
        ("Дії",         "Перегляд, Редагувати, Видалити / Відновити."),
    ]
    story.append(std_table(["Колонка", "Опис"], inv_cols, s,
                           col_widths=[4*cm, 12.5*cm]))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "💡 Фільтри: пошук за назвою/SKU, фільтр за категорією, показ видалених товарів (перемикач).",
        s["info_box"]))

    story.append(Paragraph("7.2  Картка товару", s["h2"]))
    story.append(Paragraph(
        "На картці відображаються характеристики товару та дві вкладки:",
        s["body"]))
    inv_tabs = [
        ("Залишки",  "Кількість товару по складах із датою останнього оновлення. Відображається загальний залишок."),
        ("Рухи",     "Журнал операцій: прихід або видаток, кількість, дата та нотатка. Дозволяє відстежити всю історію руху товару."),
    ]
    story.append(kv_table(inv_tabs, s))

    story.append(Paragraph("7.3  Додавання та редагування товару", s["h2"]))
    inv_fields = [
        ("Назва товару *",          "Повна назва запчастини або матеріалу."),
        ("SKU-код",                 "Артикул (унікальний ідентифікатор). Необов'язкове."),
        ("Опис",                    "Текстовий опис товару. Необов'язкове."),
        ("Категорія",               "Вибір з переліку: Оливи, Фільтри, Технічні рідини, Омивачі, Запчастини, Інше."),
        ("Підкатегорія",            "Завантажується автоматично залежно від категорії."),
        ("Одиниця виміру",          "шт / л / кг / уп / м."),
        ("Ціна",                    "Ціна одиниці товару (грн)."),
        ("Мінімальний залишок",     "Порогова кількість. При падінні нижче — товар потрапляє у вкладку «Мало на складі»."),
        ("Вязкість",                "Необов'язкове. Тільки для мастильних матеріалів (наприклад: 10W-40)."),
        ("Активний",                "Перемикач. Неактивні товари приховуються з основного переліку."),
    ]
    story.append(kv_table(inv_fields, s, (5.5*cm, 11*cm)))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 8. TELEGRAM-БОТ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("8. Telegram-бот (моніторинг)", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Розділ «Telegram бот» призначений для моніторингу взаємодії клієнтів із ботом.",
        s["body"]))
    story.append(Paragraph(
        "⚠️  Увага: цей розділ наразі відображає тестові дані. Інтеграція з реальним API бота знаходиться в розробці.",
        s["warn_box"]))
    story.append(Paragraph("Наявні елементи:", s["h3"]))
    bot_items = [
        "<b>Статистика</b> — кількість повідомлень, унікальних користувачів, пов'язаних клієнтів та повідомлень за сьогодні.",
        "<b>Таблиця журналу</b> — Chat ID, ім'я користувача, номер телефону, текст повідомлення, відповідь бота, час.",
        "<b>Пошук та дати</b> — фільтрація за ім'ям / повідомленням та діапазоном дат.",
    ]
    for item in bot_items:
        story.append(Paragraph(f"• {item}", s["bullet"]))
    story.append(Paragraph(
        "Планується: надсилання нагадувань про ТО через бот, коли статус обслуговування стає «протермінований» "
        "або наближається цільова дата/пробіг.",
        s["note"]))
    story.append(spacer())

    # ════════════════════════════════════════════════════════
    # 9. ПРОФІЛЬ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("9. Профіль користувача", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Налаштування свого облікового запису доступні через меню користувача → «Налаштування» або адресу /profile.",
        s["body"]))
    story.append(Paragraph("Вкладки профілю:", s["h2"]))
    profile_tabs = [
        ("Особисті дані",   "Редагування email, імені, прізвища, телефону та посади. Логін (username) заблоковано — незмінне."),
        ("Безпека",         "Зміна паролю: введіть поточний пароль, новий пароль та підтвердження. Мінімальна довжина — 6 символів."),
        ("Небезпечна зона", "Деактивація облікового запису. Дія незворотня — система вимагатиме підтвердження перед виконанням."),
    ]
    story.append(kv_table(profile_tabs, s))
    story.append(Paragraph(
        "⚠️  Деактивація облікового запису є незворотньою дією. Зверніться до адміністратора, якщо акаунт потрібно відновити.",
        s["warn_box"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 10. ТЕХНІЧНА ДОКУМЕНТАЦІЯ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("10. Технічна документація", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "Цей розділ призначений для розробників та системних адміністраторів.",
        s["body"]))

    # 10.1 Стек
    story.append(Paragraph("10.1  Стек технологій", s["h2"]))
    tech_rows = [
        ("React 18 + Vite 5",    "Основний фреймворк і збирач. Без TypeScript (JSX). Dev-сервер: http://localhost:3000."),
        ("Ant Design 5",         "UI-бібліотека. Локаль uk_UA. Кастомна тема в App.jsx."),
        ("React Router 6",       "Клієнтський роутинг. Всі сторінки завантажуються ліниво (lazy)."),
        ("Zustand 4",            "Глобальний стан: authStore (автентифікація), uiStore (UI-налаштування)."),
        ("Axios",                "HTTP-клієнт з interceptors для автоматичного додавання Bearer-токена та рефрешу при 401."),
        ("DayJS",                "Робота з датами. Підключена українська локаль (uk)."),
        ("Recharts",             "Графіки на дашборді."),
        ("React Query 5",        "Підключено в залежностях, але сторінки використовують useState + useEffect."),
    ]
    story.append(std_table(["Бібліотека", "Призначення"], tech_rows, s,
                           col_widths=[5*cm, 11.5*cm]))

    # 10.2 Структура
    story.append(Paragraph("10.2  Структура проєкту", s["h2"]))
    story.append(Paragraph(
        "Усі вихідні файли знаходяться в директорії <font face='Courier'>src/</font>:",
        s["body"]))
    struct_rows = [
        ("src/api/index.js",      "ЄДИНИЙ файл API. Всі axios-методи. Interceptors для токенів."),
        ("src/components/",       "Спільні компоненти: LoadingSpinner, PageHeader, StatusTag, EmptyState, ProtectedRoute."),
        ("src/layouts/",          "MainLayout (з бічним меню), AuthLayout (для сторінки входу)."),
        ("src/pages/",            "Сторінки: auth, dashboard, clients, trucks, orders, inventory, bot, profile, welcome."),
        ("src/store/authStore.js","Zustand-стор авторизації: user, isAuthenticated, setAuth, logout, updateAccessToken."),
        ("src/store/uiStore.js",  "Zustand-стор UI: sidebarCollapsed, theme, language (персистований)."),
        ("src/utils/constants.js","ORDER_STATUSES, EURO_STANDARDS, UNITS, CATEGORY_TYPES та інші константи."),
        ("src/utils/formatters.js","formatDate, formatDateTime, formatMoney, formatPhone, formatMileage."),
    ]
    story.append(std_table(["Шлях", "Опис"], struct_rows, s,
                           col_widths=[5.5*cm, 11*cm]))

    # 10.3 API
    story.append(Paragraph("10.3  API-шар", s["h2"]))
    story.append(Paragraph(
        "Весь API знаходиться в <font face='Courier'>src/api/index.js</font>. "
        "Базовий URL читається зі змінної оточення <font face='Courier'>VITE_API_URL</font>.",
        s["body"]))
    story.append(spacer(0.2))
    story.append(Paragraph("Налаштування середовищ:", s["h3"]))
    env_rows = [
        (".env.development",  "http://localhost:8000/api",      "Локальна розробка"),
        (".env.production",   "http://157.230.114.19/api",      "Production-сервер"),
    ]
    story.append(std_table(["Файл", "VITE_API_URL", "Призначення"], env_rows, s,
                           col_widths=[4.5*cm, 5.5*cm, 6.5*cm]))
    story.append(spacer(0.3))

    story.append(Paragraph("Interceptors Axios:", s["h3"]))
    interceptors = [
        "<b>Request interceptor</b> — автоматично додає <font face='Courier'>Authorization: Bearer &lt;token&gt;</font> з localStorage до кожного запиту.",
        "<b>Response interceptor (401)</b> — при отриманні статусу 401 виконується рефреш токену; конкурентні запити ставляться у чергу. При відсутності refresh_token — виклик logout() та редірект на /login.",
        "Ендпоінти <font face='Courier'>/token/</font> та <font face='Courier'>/register/</font> виключено з логіки рефрешу.",
    ]
    for item in interceptors:
        story.append(Paragraph(f"• {item}", s["bullet"]))
    story.append(spacer(0.3))

    story.append(Paragraph("Формат відповідей сервера:", s["h3"]))
    story.append(Paragraph(
        "Django Pagination повертає об'єкт із полями:",
        s["body"]))
    story.append(Paragraph(
        '{ "count": 150, "next": "...", "previous": null, "results": [...] }',
        s["code"]))
    story.append(Paragraph(
        "У коді завжди використовується патерн:",
        s["body"]))
    story.append(Paragraph(
        'const data = response.data || response;\nconst items = data.results || [];\nconst total = data.count || 0;',
        s["code"]))
    story.append(spacer(0.3))

    story.append(Paragraph("Ключові API-ресурси:", s["h3"]))
    api_rows = [
        ("/clients/",              "clientsAPI",      "CRUD + mark/unmark for deletion"),
        ("/trucks/",               "trucksAPI",        "CRUD + mark/unmark for deletion"),
        ("/orders/",               "ordersAPI",        "CRUD + статистика + ТО + фото"),
        ("/service-works/",        "worksAPI",         "Виконані роботи + запчастини"),
        ("/work-prices/",          "workGroupsAPI",    "Довідник робіт"),
        ("/inventory/products/",   "inventoryAPI",     "Товари + категорії + залишки + рухи"),
        ("/maintenance-kits/",     "maintenanceAPI",   "Комплекти ТО + фільтри"),
        ("/maintenance-intervals/","maintenanceAPI",   "Інтервали регламенту"),
        ("/users/",                "employeesAPI",     "Механіки та користувачі"),
        ("/base-models/",          "baseModelsAPI",    "Базові моделі авто"),
        ("/repair-photos/",        "—",                "Завантаження фото ремонту"),
    ]
    story.append(std_table(["Ендпоінт", "Змінна API", "Призначення"], api_rows, s,
                           col_widths=[5*cm, 4*cm, 7.5*cm]))

    # 10.4 Автентифікація
    story.append(Paragraph("10.4  Автентифікація", s["h2"]))
    auth_rows = [
        ("Токени",          "JWT (access + refresh). Зберігаються в localStorage: access_token, refresh_token, user."),
        ("authStore",       "Zustand: user, isAuthenticated, setAuth(), logout(), updateAccessToken()."),
        ("ProtectedRoute",  "Перевіряє isAuthenticated. При false — редірект на /login."),
        ("Рефреш",          "Axios interceptor автоматично оновлює access_token при 401. Конкурентні запити в черзі."),
        ("Безпека",         "Увага: localStorage вразливий до XSS. httpOnly cookies не реалізовано."),
    ]
    story.append(kv_table(auth_rows, s))

    # 10.5 Константи
    story.append(Paragraph("10.5  Константи та формати", s["h2"]))
    story.append(Paragraph(
        "Файл <font face='Courier'>src/utils/constants.js</font>:",
        s["body"]))
    const_rows = [
        ("ORDER_STATUSES",      "OPEN, IN_PROGRESS, DONE, CLOSED, CANCELED — з label та color."),
        ("EURO_STANDARDS",      "EURO3, EURO4, EURO5, EURO6 — з українськими підписами."),
        ("UNITS",               "pcs (шт), l (л), kg (кг), pack (уп), m (м)."),
        ("CATEGORY_TYPES",      "oil, filter, fluid, washer, part, other."),
        ("REMINDER_PRIORITIES", "low, medium, high, critical."),
        ("CHART_COLORS",        "Масив з 8 кольорів для графіків Recharts."),
    ]
    story.append(kv_table(const_rows, s, (5*cm, 11.5*cm)))
    story.append(spacer(0.3))

    story.append(Paragraph("Форматери (<font face='Courier'>src/utils/formatters.js</font>):", s["h3"]))
    fmt_rows = [
        ("formatDate(date)",           "DD.MM.YYYY                →  «01.03.2026»"),
        ("formatDateTime(date)",       "DD.MM.YYYY HH:mm          →  «01.03.2026 14:30»"),
        ("formatMoney(amount)",        "Форматує гривні           →  «1 234,56 грн»"),
        ("formatMileage(mileage)",     "Форматує км               →  «123 456 км»"),
        ("formatPhone(phone)",         "Форматує телефон          →  «+38 (0XX) XXX-XX-XX»"),
        ("formatRelativeTime(date)",   "Відносний час             →  «2 години тому»"),
        ("truncateText(text, 50)",     "Скорочує текст            →  «Скорочений текст...»"),
    ]
    story.append(std_table(["Функція", "Результат"], fmt_rows, s,
                           col_widths=[6*cm, 10.5*cm]))

    # 10.6 Розгортання
    story.append(Paragraph("10.6  Розгортання", s["h2"]))
    story.append(Paragraph(
        "Проєкт розгортається автоматично через <b>GitHub Actions</b>. "
        "Після <font face='Courier'>git push</font> на гілку <font face='Courier'>main</font> "
        "запускається pipeline, який збирає та деплоїть застосунок на сервер.",
        s["body"]))
    deploy_rows = [
        ("npm run dev",     "Запуск dev-сервера на http://localhost:3000"),
        ("npm run build",   "Production-білд у директорію dist/"),
        ("npm run preview", "Локальний перегляд production-білду"),
        ("npm run lint",    "Перевірка ESLint (0 warnings дозволено)"),
    ]
    story.append(kv_table(deploy_rows, s, (4.5*cm, 12*cm)))
    story.append(spacer(0.2))
    story.append(Paragraph(
        "Примітка: <font face='Courier'>manualChunks: undefined</font> у vite.config.js — навмисне рішення "
        "для обходу бага з <font face='Courier'>createContext</font> при chunking.",
        s["note"]))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 11. ОБМЕЖЕННЯ
    # ════════════════════════════════════════════════════════
    story.append(Paragraph("11. Відомі обмеження та плани", s["h1"]))
    story.append(hr(C_PRIMARY, 1.5))

    story.append(Paragraph("Поточні обмеження", s["h2"]))
    limits = [
        ("<b>BotPage</b> — повністю на mock-даних; API Telegram-бота не підключено.", "warn"),
        ("<b>Dashboard</b> — графік на hardcoded mock-даних; лічильники openOrders, inProgressOrders, monthlyRevenue = 0.", "warn"),
        ("<b>Токени в localStorage</b> — вразливо до XSS-атак; httpOnly cookies не реалізовано.", "warn"),
        ("<b>React Query</b> — підключено, але не використовується; всі сторінки на useState + useEffect.", "info"),
        ("<b>TruckDetailPage</b> — для визначення назви base_model виконується завантаження всіх базових моделей (неоптимально).", "info"),
        ("<b>TruckFormPage</b> — список клієнтів обмежено 50; при перевищенні — окремий fallback-запит.", "info"),
        ("<b>Без тестів</b> — жодного test-файлу у проєкті.", "warn"),
    ]
    for text, kind in limits:
        style_key = "warn_box" if kind == "warn" else "info_box"
        story.append(Paragraph(f"• {text}", s["bullet"]))
    story.append(spacer(0.3))

    story.append(Paragraph("Заплановано", s["h2"]))
    plans = [
        "Telegram-бот: надсилати нагадування про ТО, коли статус обслуговування стає «протермінований» або наближається target_date / target_mileage.",
        "Перехід на React Query для всіх сторінок — кешування, фонові рефетчи, оптимістичні оновлення.",
        "httpOnly cookies замість localStorage для зберігання токенів.",
        "Додавання тестів (Vitest + React Testing Library).",
    ]
    for plan in plans:
        story.append(Paragraph(f"• {plan}", s["bullet"]))
    story.append(spacer(0.5))
    story.append(hr(C_PRIMARY, 1.5))
    story.append(Paragraph(
        "TruckMaster CRM © 2026  •  Документ згенеровано автоматично  •  Версія 1.0",
        s["footer"]))

    return story


# ── Генерація ────────────────────────────────────────────────────────────────
def main():
    output = "TruckMaster_Documentation.pdf"
    s = build_styles()

    doc = DocTemplate(
        output,
        pagesize=A4,
        title="TruckMaster CRM — Документація",
        author="TruckMaster CRM",
        subject="Технічна документація та інструкція користувача",
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    story = build_content(s)
    doc.build(story)
    print(f"OK  Dokument zberezheno: {os.path.abspath(output)}")


if __name__ == "__main__":
    main()
