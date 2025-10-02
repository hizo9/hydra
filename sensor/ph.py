# imports
import time
import board
import busio
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn

# calibration
PH_7_VOLTAGE = 2.460
PH_4_VOLTAGE = 2.960

def voltage_to_ph(voltage):
    if PH_4_VOLTAGE == PH_7_VOLTAGE:
        raise ValueError("Calibration voltages must be different.")
    slope = (4.0 - 7.0) / (PH_4_VOLTAGE - PH_7_VOLTAGE)
    return 7.0 + slope * (voltage - PH_7_VOLTAGE)

# setup hardware
print("Initializing I2C and ADS1115...")
i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS.ADS1115(i2c, address=0x48)
ads.gain = 1
ph_channel = AnalogIn(ads, ADS.P0)

print("PH Sensor Ready!")
print("-" * 60)

# main loop
try:
    while True:
        voltage = ph_channel.voltage
        ph_value = voltage_to_ph(voltage)
        ph_value = max(0.0, min(14.0, ph_value))
        
        print(f"Voltage: {voltage:.3f} V → pH: {ph_value:.2f}")
        
        if ph_value < 6.5:
            quality = "Acidic"
        elif ph_value > 8.5:
            quality = "Basic"
        else:
            quality = "Good"
        print(f"Water Quality: {quality}")
        print("-" * 60)
        
        time.sleep(2)

except KeyboardInterrupt:
    print("\nStopped.")