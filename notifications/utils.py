import re

# Şablonlarda yalnız {kelime} biçimli tokenlara izin verilir.
TOKEN_PATTERN = re.compile(r"\{(\w+)\}")


def render_template(template, payload):
    """Güvenli ikame: yalnız {kelime} tokenları payload değeriyle değişir.

    str.format'tan farklı olarak attribute/index erişimi imkânsız; bilinmeyen/
    eksik anahtar boş string olur.
    """
    return TOKEN_PATTERN.sub(lambda m: str(payload.get(m.group(1), "")), template or "")


def extract_template_keys(template):
    """Şablonda kullanılan {kelime} token anahtarlarını döndürür."""
    return set(TOKEN_PATTERN.findall(template or ""))


def format_user_name(user, fallback=""):
    """Kullanıcının görünen adı: tam ad, yoksa kullanıcı adı."""
    if user is None:
        return fallback
    return (user.get_full_name() or "").strip() or user.username


def active_admins(exclude=None):
    """Aktif admin kullanıcılar; isteğe bağlı olarak bir kullanıcıyı hariç tutar."""
    from accounts.models import CustomUser

    qs = CustomUser.objects.filter(role="ADMIN", is_active=True)
    if exclude is not None:
        qs = qs.exclude(pk=getattr(exclude, "pk", exclude))
    return list(qs)
