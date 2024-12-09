#include "Wire.h"
#include <MPU6050_light.h>

#define SDA_PIN 1  // Default SDA pin for ESP32
#define SCL_PIN 2  // Default SCL pin for ESP32

MPU6050 mpu(Wire);
unsigned long timer = 0;

void setup() {
    Serial.begin(115200);
  Serial.println("Starting setup...");

  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("Wire.begin completed.");

  Serial.println("Initializing MPU6050...");
  byte status = mpu.begin();
  Serial.print(F("MPU6050 status: "));
  Serial.println(status);
  if (status != 0) {
    Serial.println("MPU6050 failed to initialize. Please check wiring and I2C pins.");
    while (true); // Stop everything here if MPU6050 failed to initialize
  }

  Serial.println(F("Calculating offsets, do not move MPU6050"));
  delay(1000);
  mpu.calcOffsets();  // gyro and accelero offsets calculation
  delay(2000);  // Delay after calculating offsets for stabilization
  Serial.println("Offsets calculated.");
  Serial.println("Setup complete.\n");
  }

void loop() {
  
      mpu.update();
    
  if ((millis() - timer) > 100) {  // send data every 100ms
        float angleX = mpu.getAngleX();
    float angleY = mpu.getAngleY();
    float angleZ = mpu.getAngleZ();

    if (isnan(angleX) || isnan(angleY) || isnan(angleZ)) {
      Serial.println("Error: Unable to read angle values from MPU6050. Please check sensor connection and wiring.");
    } else {
      Serial.print("X: ");
      Serial.print(angleX);
      Serial.print(", Y: ");
      Serial.print(angleY);
      Serial.print(", Z: ");
      Serial.println(angleZ);
    }

    timer = millis();
      }
}
