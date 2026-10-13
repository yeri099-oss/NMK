# firestore.rules 를 고친 뒤 이 스크립트를 실행하면 rules.html(복사 도우미)이 다시 만들어집니다.
#   python3 build-rules-page.py
import html, pathlib
root = pathlib.Path(__file__).parent
rules = (root / "firestore.rules").read_text(encoding="utf-8")
tpl = (root / "rules.template.html").read_text(encoding="utf-8")
(root / "rules.html").write_text(tpl.replace("{{RULES}}", html.escape(rules)), encoding="utf-8")
print("rules.html 생성 완료")
