import pytest

from exporter.services.file_service import FileService


def test_file_service_save_and_delete_by_absolute_path(tmp_path):
    root = tmp_path / "exports"
    service = FileService(root=root)

    saved = service.save(
        model_name="Customer Export",
        extension="csv",
        content=b"header\nvalue\n",
    )

    assert saved.file_name.endswith(".csv")
    assert saved.absolute_path.exists()
    assert saved.absolute_path.read_bytes() == b"header\nvalue\n"
    assert saved.relative_path.startswith("exports/customer-export/")

    deleted = service.delete(absolute_path=saved.absolute_path)

    assert deleted is True
    assert saved.absolute_path.exists() is False
    assert (root / "customer-export").exists() is False


def test_file_service_rejects_path_outside_export_root(tmp_path):
    root = tmp_path / "exports"
    root.mkdir(parents=True)
    service = FileService(root=root)

    outside_file = tmp_path / "outside.csv"
    outside_file.write_text("bad")

    with pytest.raises(ValueError, match="inside the export directory"):
        service.delete(absolute_path=outside_file)


def test_file_service_delete_returns_false_for_missing_path(tmp_path):
    service = FileService(root=tmp_path / "exports")

    deleted = service.delete(relative_path="exports/customer/missing.csv")

    assert deleted is False
