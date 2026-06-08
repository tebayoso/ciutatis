import pytest

from superparser.clients.drive import extract_drive_file_id


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("1abcDEF_234", "1abcDEF_234"),
        ("https://drive.google.com/file/d/1abcDEF_234/view?usp=sharing", "1abcDEF_234"),
        ("https://drive.google.com/open?id=1abcDEF_234", "1abcDEF_234"),
        ("https://drive.google.com/drive/folders/folder_123", "folder_123"),
    ],
)
def test_extract_drive_file_id_accepts_ids_and_common_drive_urls(value, expected):
    assert extract_drive_file_id(value) == expected


def test_extract_drive_file_id_rejects_unparseable_url():
    with pytest.raises(ValueError):
        extract_drive_file_id("https://drive.google.com/")
