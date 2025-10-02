# imports
import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
import os
import glob
import numpy as np
import pickle
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore
from gpiozero import LED

# aerator setup
aerator = LED(17)
aerator_active = False
aerator_start_time = 0

# firebase setup
FIREBASE_KEY_PATH = "firebase-service-account.json"
try:
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firestore connected")
    FIREBASE_ENABLED = True
except Exception as e:
    print(f"Firestore init failed: {e}")
    FIREBASE_ENABLED = False

# calibration
PH_7_VOLTAGE = 2.460
PH_4_VOLTAGE = 2.960

def voltage_to_ph(voltage):
    if PH_4_VOLTAGE == PH_7_VOLTAGE:
        raise ValueError("Calibration voltages must be different.")
    slope = (4.0 - 7.0) / (PH_4_VOLTAGE - PH_7_VOLTAGE)
    return 7.0 + slope * (voltage - PH_7_VOLTAGE)

CLEAR_VOLTAGE = 4.20
TURBID_VOLTAGE = 1.80
TURBID_NTU = 1000

def voltage_to_ntu(voltage):
    if voltage >= CLEAR_VOLTAGE:
        return 0.0
    elif voltage <= TURBID_VOLTAGE:
        return float(TURBID_NTU)
    else:
        slope = TURBID_NTU / (CLEAR_VOLTAGE - TURBID_VOLTAGE)
        return slope * (CLEAR_VOLTAGE - voltage)

# load ML model (xgboost)
try:
    with open("wqi_24h_model.pkl", "rb") as f:
        model = pickle.load(f)
    print("WQI 24h prediction model loaded")
except Exception as e:
    print(f"Model load failed: {e}")
    exit(1)

# hardware setup
print("Initializing I2C and sensors...")
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c, address=0x48)
ads.gain = 1
ph_channel = AnalogIn(ads, ADS.P0)
turb_channel = AnalogIn(ads, ADS.P1)

os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')
base_dir = '/sys/bus/w1/devices/'
try:
    device_folder = glob.glob(base_dir + '28*')[0]
    device_file = device_folder + '/w1_slave'
    print(f"DS18B20 found at: {device_folder}")
except IndexError:
    print("DS18B20 not found! Check 1-Wire is enabled.")
    exit(1)

def read_temp():
    with open(device_file, 'r') as f:
        lines = f.readlines()
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        with open(device_file, 'r') as f:
            lines = f.readlines()
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos + 2:]
        return float(temp_string) / 1000.0
    return None

# main loop
print("\nStarting water quality monitoring (hourly Firestore upload)...")
print("-" * 65)

last_upload_time = 0

try:
    while True:
        current_time = time.time()
        
        # read sensors
        ph_val = max(0.0, min(14.0, voltage_to_ph(ph_channel.voltage)))
        ntu_val = voltage_to_ntu(turb_channel.voltage)
        temp_val = read_temp()
        
        if temp_val is not None:
            wqi_24h = model.predict(np.array([[ph_val, temp_val, ntu_val]]))[0]
            print(f"pH: {ph_val:.2f} | Temp: {temp_val:.1f}°C | Turbidity: {ntu_val:.1f} NTU | WQI_24h: {wqi_24h:.1f}")
            
            if wqi_24h < 50:
                if not aerator_active:
                    print("WQI is poor (< 50) - turning ON aerator")
                    aerator.on()
                    aerator_active = True
                    aerator_start_time = current_time
            else:
                if aerator_active:
                    if current_time - aerator_start_time >= 3600:
                        print("Aerator hour complete - turning OFF")
                        aerator.off()
                        aerator_active = False
                    else:
                        remaining_time = 3600 - (current_time - aerator_start_time)
                        print(f"Aerator still running (remaining: {remaining_time:.0f}s)")
        else:
            print("Temperature sensor read failed.")
            if aerator_active:
                aerator.off()
                aerator_active = False

        # upload to firebase hourly
        if FIREBASE_ENABLED and temp_val is not None:
            if current_time - last_upload_time >= 3600:
                data = {
                    "ph": float(round(ph_val, 2)),
                    "temperature_c": float(round(temp_val, 1)),
                    "turbidity_ntu": float(round(ntu_val, 1)),
                    "wqi_24h_prediction": float(round(wqi_24h, 1)),
                    "aerator_active": aerator_active,
                    "timestamp": datetime.now(timezone.utc)
                }
                try:
                    db.collection("readings").add(data)
                    print("Uploaded to Firestore")
                    last_upload_time = current_time
                except Exception as e:
                    print(f"Firestore upload failed: {e}")

        print("-" * 65)
        time.sleep(2)

except KeyboardInterrupt:
    print("\nMonitoring stopped by user.")
    if aerator_active:
        aerator.off()
        print("Aerator turned OFF")