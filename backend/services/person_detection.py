from ultralytics import YOLO

# 起動時にモデルをロード（高速化）
yolo_model = YOLO("yolov8n.pt")  # 軽量モデル。必要なら yolov8s.pt などに変更

def detect_persons(frame: np.ndarray) -> List[Dict]:
    results = model(frame)

    # resultsがlistなら最初の要素を取る
    if isinstance(results, list):
        results = results[0]

    persons = []
    boxes = results.boxes.xyxy.cpu().numpy().astype(int)
    classes = results.boxes.cls.cpu().numpy().astype(int)

    for box, cls in zip(boxes, classes):
        if cls != 0:
            continue
        x1, y1, x2, y2 = box
        feature = extract_feature(frame, [x1, y1, x2, y2])
        pid = identify_person(feature)
        persons.append({
            "id": pid,
            "box": [x1, y1, x2, y2]
        })
    return persons
