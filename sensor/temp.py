# imports
import os
import glob
import time

# load kernel modules (incase not autoloaded)
os.system('modprobe w1-gpio')
os.system('modprobe w1-therm')

# find sensor directory
base_dir = '/sys/bus/w1/devices/'
try:
    device_folder = glob.glob(base_dir + '28*')[0]
    device_file = device_folder + '/w1_slave'
    print(f"Found DS18B20 at: {device_folder}")
except IndexError:
    print("DS18B20 not found! Check wiring and 1-Wire is enabled.")
    exit(1)

# functions to read temperature
def read_temp_raw():
    with open(device_file, 'r') as f:
        return f.readlines()

def read_temp():
    lines = read_temp_raw()
    
    while lines[0].strip()[-3:] != 'YES':
        time.sleep(0.2)
        lines = read_temp_raw()
    
    equals_pos = lines[1].find('t=')
    if equals_pos != -1:
        temp_string = lines[1][equals_pos+2:]
        temp_c = float(temp_string) / 1000.0
        return temp_c
    return None

# main loop
print("Reading DS18B20 temperature every 2 seconds...")
print("-" * 50)

try:
    while True:
        temp = read_temp()
        if temp is not None:
            print(f"Temperature: {temp:.2f} °C")
        else:
            print("❌ Failed to read temperature")
        time.sleep(2)
        
except KeyboardInterrupt:
    print("\nStopped by user.")