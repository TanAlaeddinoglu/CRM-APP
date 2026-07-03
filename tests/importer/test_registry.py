import pytest

from importer.base import BaseImporter
from importer.exceptions import ImporterNotFound
from importer.registry import ImporterRegistry


class _DummyImporter(BaseImporter):
    model_key = "dummy"

    def preview(self, rows):
        return {}

    def import_rows(self, rows):
        return {"success_count": 0, "error_count": 0, "skipped_count": 0}


def test_register_and_get():
    reg = ImporterRegistry()
    reg.register("dummy", _DummyImporter)
    assert reg.get("dummy") is _DummyImporter


def test_get_unknown_key_raises():
    reg = ImporterRegistry()
    with pytest.raises(ImporterNotFound):
        reg.get("nonexistent")


def test_keys():
    reg = ImporterRegistry()
    reg.register("a", _DummyImporter)
    reg.register("b", _DummyImporter)
    assert set(reg.keys()) == {"a", "b"}


def test_register_overwrites():
    reg = ImporterRegistry()

    class _OtherImporter(_DummyImporter):
        pass

    reg.register("x", _DummyImporter)
    reg.register("x", _OtherImporter)
    assert reg.get("x") is _OtherImporter
