from collections.abc import Iterable


def vector_literal(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"
