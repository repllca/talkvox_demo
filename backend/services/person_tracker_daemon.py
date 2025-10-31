import cv2
import time
from services.person_tracking import detect_persons

current_persons = []

def person_tracking_loop():
    global current_persons
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ カメラが開けませんでした。")
        return

    print("👁 人物トラッキング開始")

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        persons = detect_persons(frame)
        current_persons = persons  # 最新情報を共有
        time.sleep(0.2)

def get_current_persons():
    return current_persons
