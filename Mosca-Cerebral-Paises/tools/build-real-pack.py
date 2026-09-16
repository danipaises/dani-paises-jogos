#!/usr/bin/env python3
import argparse
import json
import math
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.feather as feather
import pyarrow.ipc as ipc


def parse_ids(raw: str):
    ids = []
    for part in raw.replace("\n", ",").split(","):
        part = part.strip()
        if not part:
            continue
        ids.append(int(part))
    if not ids:
        raise SystemExit("Nenhum ID informado em --ids")
    return ids


def load_annotations(path: Path, selected):
    table = feather.read_table(path)
    names = set(table.column_names)
    if "bodyId" not in names:
        raise SystemExit(f"Arquivo de anotações sem coluna bodyId. Colunas: {table.column_names}")
    body = table["bodyId"].to_pylist()
    labels = table["type"].to_pylist() if "type" in names else [None] * len(body)
    sides = table["somaSide"].to_pylist() if "somaSide" in names else [None] * len(body)
    wanted = set(selected)
    out = {}
    for b, label, side in zip(body, labels, sides):
        if b is None:
            continue
        bid = int(b)
        if bid in wanted:
            out[bid] = {"label": label or str(bid), "side": side}
    return out


def iter_weight_batches(path: Path):
    source = pa.memory_map(str(path), "r")
    reader = ipc.open_file(source)
    schema = reader.schema
    needed = ["body_pre", "body_post", "weight"]
    missing = [c for c in needed if c not in schema.names]
    if missing:
        raise SystemExit(f"Arquivo de pesos sem colunas {missing}. Colunas: {schema.names}")
    idx = [schema.get_field_index(c) for c in needed]
    for i in range(reader.num_record_batches):
        batch = reader.get_batch(i)
        yield tuple(batch.column(j).to_numpy(zero_copy_only=False) for j in idx)


def build_edges(path: Path, selected, min_weight: int):
    selected_np = np.array(selected, dtype=np.int64)
    edges = []
    for body_pre, body_post, weight in iter_weight_batches(path):
        mask = np.isin(body_pre, selected_np) & np.isin(body_post, selected_np) & (weight >= min_weight)
        if not mask.any():
            continue
        pre = body_pre[mask]
        post = body_post[mask]
        w = weight[mask]
        edges.extend([[str(int(a)), str(int(b)), int(c)] for a, b, c in zip(pre, post, w)])
    return edges


def make_nodes(selected, annotations):
    n = len(selected)
    nodes = []
    for i, bid in enumerate(selected):
        angle = (i / max(n, 1)) * math.tau
        info = annotations.get(bid, {})
        label = info.get("label") or str(bid)
        side = info.get("side")
        nodes.append({
            "id": str(bid),
            "label": label,
            "group": side or "real",
            "x": round(0.5 + 0.42 * math.cos(angle), 6),
            "y": round(0.5 + 0.42 * math.sin(angle), 6),
            "description": f"MaleCNS v1.0 body {bid}" + (f" • lado {side}" if side else "")
        })
    return nodes


def main():
    ap = argparse.ArgumentParser(description="Gera um pack JSON pequeno com conectividade real MaleCNS v1.0")
    ap.add_argument("--weights", required=True, type=Path, help="connectome-weights-...feather")
    ap.add_argument("--annotations", required=True, type=Path, help="body-annotations-...feather")
    ap.add_argument("--ids", required=True, help="IDs separados por vírgula")
    ap.add_argument("--min-weight", type=int, default=1, help="peso mínimo da conexão")
    ap.add_argument("--out", required=True, type=Path, help="arquivo JSON de saída")
    args = ap.parse_args()

    selected = parse_ids(args.ids)
    annotations = load_annotations(args.annotations, selected)
    edges = build_edges(args.weights, selected, args.min_weight)
    nodes = make_nodes(selected, annotations)

    pack = {
        "meta": {
            "source": "MaleCNS v1.0",
            "scientific": True,
            "min_weight": args.min_weight,
            "selected_neurons": len(nodes),
            "selected_edges": len(edges),
            "note": "Pesos preservados do arquivo oficial; posições 2D são apenas layout de visualização."
        },
        "nodes": nodes,
        "edges": edges
    }
    args.out.write_text(json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Pack criado: {args.out}")
    print(f"Neurônios: {len(nodes)} | conexões: {len(edges)}")


if __name__ == "__main__":
    main()
