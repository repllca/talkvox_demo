from ultralytics import YOLO

# 起動時にモデルをロード（高速化）
yolo_model = YOLO("yolov8n.pt")  # 軽量モデル。必要なら yolov8s.pt などに変更

def detect_persons(frame):
    """YOLOで人物を検出してバウンディングボックスを返す"""
    results = yolo_model.predict(source=frame, classes=[0], conf=0.5, verbose=False)
    persons = []

    for r in results:
        for box in r.boxes:
            x_min, y_min, x_max, y_max = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            persons.append({
                "x_min": int(x_min),
                "y_min": int(y_min),
                "x_max": int(x_max),
                "y_max": int(y_max),
                "confidence": conf
            })

    return persons
