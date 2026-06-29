from __future__ import annotations

"""
Generic duplicate-detection helpers.

These functions are domain-agnostic: they work with any field name and any
Django model.  Domain-specific logic (e.g. phone +/- prefix candidates)
belongs in the domain's own checker, not here.
"""


def find_file_duplicates(rows: list[dict], field: str) -> dict[int, int]:
    """
    Detect rows that share the same field value within the list.

    Returns a mapping of {duplicate_index: first_seen_index} for every row
    that has a value already encountered at an earlier position.
    """
    seen: dict[str, int] = {}
    duplicates: dict[int, int] = {}
    for idx, row in enumerate(rows):
        value = str(row.get(field) or "").strip()
        if not value:
            continue
        if value in seen:
            duplicates[idx] = seen[value]
        else:
            seen[value] = idx
    return duplicates


def find_db_duplicates(
    rows: list[dict],
    field: str,
    model_class,
    model_field: str,
) -> set[str]:
    """
    Return the set of field values (from `rows`) that already exist in the DB.

    Performs a single IN query on `model_class.model_field`.
    For fields that have +/- variants (e.g. phone numbers), expand the
    candidate set in the caller before passing to this function.
    """
    values = {str(row.get(field) or "").strip() for row in rows}
    values.discard("")
    if not values:
        return set()
    return set(
        model_class.objects.filter(**{f"{model_field}__in": list(values)}).values_list(
            model_field, flat=True
        )
    )
