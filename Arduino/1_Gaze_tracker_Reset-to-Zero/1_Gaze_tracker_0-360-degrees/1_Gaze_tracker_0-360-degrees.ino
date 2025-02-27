#include "Wire.h"
#include <MPU6050_light.h>
#include <FirebaseESP32.h>

// Provide the token generation process info.
#include <addons/TokenHelper.h>

// Provide the RTDB payload printing info and other helper functions.
#include <addons/RTDBHelper.h>

/* 1. Define the WiFi credentials */
#define WIFI_SSID "Columbia University"
#define WIFI_PASSWORD ""

/* 2. Define the API Key */
#define API_KEY "AIzaSyDrxEgJHzvHEeDBIIXiO3OUMiXr4u3b50g"

/* 3. Define the RTDB URL */
#define DATABASE_URL "gaze-tracker-b39a8-default-rtdb.firebaseio.com" //<databaseName>.firebaseio.com or <databaseName>.<region>.firebasedatabase.app

/* 4. Define the user Email and password that alreadey registerd or added in your project */
#define USER_EMAIL "vuj2000@columbia.edu"
#define USER_PASSWORD "Taxino.9211$"

#define SDA_PIN 1  // Default SDA pin for ESP32
#define SCL_PIN 2  // Default SCL pin for ESP32

// Define Firebase Data object
FirebaseData fbdo;

FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;

unsigned long count = 0;

MPU6050 mpu(Wire);
unsigned long timer = 0;
float baseAngleX = 0.0;
float baseAngleY = 0.0;
float baseAngleZ = 0.0;

void setup() {
    Serial.begin(115200);
    Serial.println("Starting setup...");

    //// CONNECTING TO WIFI AND FIREBASE 
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to Wi-Fi");
    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(300);
    }
    Serial.println();
    Serial.print("Connected with IP: ");
    Serial.println(WiFi.localIP());
    Serial.println();

    Serial.printf("Firebase Client v%s\n\n", FIREBASE_CLIENT_VERSION);

    /* Assign the api key (required) */
    config.api_key = API_KEY;

    /* Assign the user sign in credentials */
    auth.user.email = USER_EMAIL;
    auth.user.password = USER_PASSWORD;

    /* Assign the RTDB URL (required) */
    config.database_url = DATABASE_URL;

    /* Assign the callback function for the long running token generation task */
    config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h

    // Comment or pass false value when WiFi reconnection will control by your code or third party library e.g. WiFiManager
    Firebase.reconnectNetwork(true);

    // Since v4.4.x, BearSSL engine was used, the SSL buffer need to be set.
    // Large data transmission may require larger RX buffer, otherwise connection issue or data read time out can be occurred.
    fbdo.setBSSLBufferSize(4096 /* Rx buffer size in bytes from 512 - 16384 */, 1024 /* Tx buffer size in bytes from 512 - 16384 */);

    Firebase.begin(&config, &auth);

    Firebase.setDoubleDigits(5);

    ///////////////// CONNECTING TO MPU6050
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
    delay(1000);  // Delay after calculating offsets for stabilization
    Serial.println("Offsets calculated.");

    // Set base angles to current angles to start from zero
    mpu.update();
    baseAngleX = mpu.getAngleX();
    baseAngleY = mpu.getAngleY();
    baseAngleZ = mpu.getAngleZ();

    Serial.println("Setup complete.\n");
}

void loop() {
    mpu.update();

    if ((millis() - timer) > 100) {  // send data every 100ms
        float angleX = mpu.getAngleX() - baseAngleX;
        float angleY = mpu.getAngleY() - baseAngleY;
        float angleZ = mpu.getAngleZ() - baseAngleZ;

        // Normalize angles to the range [-360, 360) without decimals
        int normalizedAngleX = (int)fmod(angleX + 360.0, 360.0);
        int normalizedAngleY = (int)fmod(angleY + 360.0, 360.0);
        int normalizedAngleZ = (int)fmod(angleZ + 360.0, 360.0);

        if (isnan(normalizedAngleX) || isnan(normalizedAngleY) || isnan(normalizedAngleZ)) {
            Serial.println("Error: Unable to read angle values from MPU6050. Please check sensor connection and wiring.");
        } else {
            Serial.print("X: ");
            Serial.print(normalizedAngleX);
            Serial.print(", Y: ");
            Serial.print(normalizedAngleY);
            Serial.print(", Z: ");
            Serial.println(normalizedAngleZ);

            // Send data to Firebase
            if (Firebase.ready()) {
                Firebase.setInt(fbdo, F("/angle/x"), normalizedAngleX);
                Firebase.setInt(fbdo, F("/angle/y"), normalizedAngleY);
                Firebase.setInt(fbdo, F("/angle/z"), normalizedAngleZ);
            }
        }

        timer = millis();
    }
}
