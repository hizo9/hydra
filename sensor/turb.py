# imports
import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# calibration
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

# setup hardware
print("Initializing I2C and ADS1115...")
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c, address=0x48)
ads.gain = 1

turb_channel = AnalogIn(ads, ADS.P1)  # A1 = P1

print("Ready! Reading turbidity sensor every 2 seconds...")
print("-" * 55)

# main loop
try:
    while True:
        voltage = turb_channel.voltage
        ntu = voltage_to_ntu(voltage)
        print(f"Voltage: {voltage:.3f} V → Turbidity: {ntu:.1f} NTU")
        time.sleep(2)

except KeyboardInterrupt:
    print("\nStopped by user.")