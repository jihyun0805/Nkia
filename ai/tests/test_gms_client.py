import sys
from unittest.mock import Mock

for module_name in ["app.llm.gms_client", "app.llm"]:
    module = sys.modules.get(module_name)
    if isinstance(module, Mock):
        sys.modules.pop(module_name, None)

from app.llm.gms_client import build_grounded_answer_system_prompt, build_plain_grounded_answer_prompt


def test_grounded_answer_prompt_requires_plain_language_format() -> None:
    system_prompt = build_grounded_answer_system_prompt()
    user_prompt = build_plain_grounded_answer_prompt()

    assert "일반 직원도 바로 이해" in system_prompt
    assert "쉬운 말" in system_prompt
    assert "45자" in system_prompt
    assert "결론:" in user_prompt
    assert "왜냐하면:" in user_prompt
    assert "다음에 볼 것:" in user_prompt
