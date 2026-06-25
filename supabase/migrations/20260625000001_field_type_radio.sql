-- フォーム項目タイプに「ラジオボタン（単一選択）」を追加。
-- 既存データへの影響なし（選択肢を追加するのみ）。
alter type field_type add value if not exists 'radio';
