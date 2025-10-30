STATUS_CHOICES = [
    ("active", "active"),
    ("archived", "archived"),
    ("quarantine", "quarantine"),
]
SOURCE_CHOICES = [
    ("meta", "meta"),
    ("google", "google"),
    ("manual", "manual"),
]

COLOUR_CHOICES = [
    ("#FF0000", "red"),
    ("#800000", "maroon"),
    ("#FFFF00", "yellow"),
    ("#008000", "green"),
    ("#0000FF", "blue"),
    ("#00FFFF", "Aqua"),
    ("#800080", "purple"),
]
APPOINTMENT_TYPES = [
    ("muayene", "Muayene"),
    ("ameliyat", "Ameliyat"),
    ("tedavi", "Tedavi"),
]
APPOINTMENT_STATUS = [
    ("beklemede", "Beklemede"),
    ("satis", "Satış"),
    ("olumsuz", "Olumsuz")
]
PAYMENT_STATUS= [
    ("kismi", "Kısmi"),
    ("tamamlandi", "Tamamlandı"),
    ("iptal", "Iptal")
]
DEFAULT_TAG_ID = 2
