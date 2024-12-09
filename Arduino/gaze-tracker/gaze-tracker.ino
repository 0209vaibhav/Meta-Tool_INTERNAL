#include "Wire.h"
#include <MPU6050_light.h>
#include <WiFi.h>
#include <FirebaseESP32.h>

// Firebase setup
FirebaseConfig config;
FirebaseAuth auth;

// WiFi setup
#define WIFI_SSID "Columbia University"  // Replace with your WiFi network name
#define WIFI_PASSWORD ""  // Replace with your WiFi password

#define SDA_PIN 1  // Standard SDA pin for ESP32
#define SCL_PIN 2  // Standard SCL pin for ESP32

MPU6050 mpu(Wire);
FirebaseData firebaseData;
unsigned long timer = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("Starting setup...");

  Wire.begin(SDA_PIN, SCL_PIN);
  Serial.println("Wire.begin completed.");

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  int wifi_attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    wifi_attempts++;
    if (wifi_attempts > 20) {  // Stop after 20 attempts (10 seconds)
      Serial.println("\nFailed to connect to WiFi. Please check your credentials and network availability.");
      while (true); // Stop everything if WiFi connection fails
    }
  }
  Serial.println("\nConnected to WiFi");
  delay(2000);  // Add delay to stabilize the system after WiFi connection

  // Firebase configuration
  Serial.println("Configuring Firebase...");
  config.host = "gaze-tracker-b39a8-default-rtdb.firebaseio.com";  // Remove https:// and the trailing /
  config.api_key = "AIzaSyDrxEgJHzvHEeDBIIXiO3OUMiXr4u3b50g";  // Replace with your actual API key

  // Optionally, configure timeouts and buffer sizes
  config.timeout.serverResponse = 20 * 1000;  // Increase to 20 seconds

  // Firebase authentication, if needed (not mandatory for public rules)
  auth.user.email = "YOUR_EMAIL"; // Replace with your Firebase email if needed
  auth.user.password = "YOUR_PASSWORD";      // Replace with your Firebase password if needed

  // Firebase begin
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Serial.println("Firebase initialized.");

  if (!Firebase.ready()) {
    Serial.println("Failed to initialize Firebase. Stopping.");
    while (true); // Stop everything if Firebase failed to initialize
  }

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
  Serial.println("Entering loop...");

  Serial.println("Updating MPU6050...");
  mpu.update();
  Serial.println("MPU update complete.");

  if ((millis() - timer) > 100) {  // send data every 100ms
    Serial.println("Reading angles...");
    float angleX = mpu.getAngleX();
    float angleY = mpu.getAngleY();
    float angleZ = mpu.getAngleZ();

    if (isnan(angleX) || isnan(angleY) || isnan(angleZ)) {
      Serial.println("Error: Unable to read angle values from MPU6050. Please check sensor connection.");
    } else {
      Serial.print("X: ");
      Serial.print(angleX);
      Serial.print(", Y: ");
      Serial.print(angleY);
      Serial.print(", Z: ");
      Serial.println(angleZ);

      // Send data to Firebase
      Serial.println("Sending data to Firebase...");
      if (Firebase.ready()) {
        if (!Firebase.setFloat(firebaseData, "/gyroscope/angleX", angleX)) {
          Serial.println("Failed to set angleX data: " + firebaseData.errorReason());
        } else {
          Serial.println("angleX data sent successfully.");
        }

        if (!Firebase.setFloat(firebaseData, "/gyroscope/angleY", angleY)) {
          Serial.println("Failed to set angleY data: " + firebaseData.errorReason());
        } else {
          Serial.println("angleY data sent successfully.");
        }

        if (!Firebase.setFloat(firebaseData, "/gyroscope/angleZ", angleZ)) {
          Serial.println("Failed to set angleZ data: " + firebaseData.errorReason());
        } else {
          Serial.println("angleZ data sent successfully.");
        }
      } else {
        Serial.println("Firebase connection not ready");
      }
    }

    timer = millis();
    Serial.println("Data send cycle complete.\n");
  }
}
