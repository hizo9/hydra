# imports
from gpiozero import LED
from time import sleep

# main code
relay = LED(17)
print("starting")

print("aerator on")
relay.on()
sleep(5)

print("aerator off")
relay.off()