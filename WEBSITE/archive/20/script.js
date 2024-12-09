// Firebase configuration and initialization
document.addEventListener('DOMContentLoaded', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyDrxEgJHzvHEeDBIIXiO3OUMiXr4u3b50g",
        authDomain: "gaze-tracker-b39a8.firebaseapp.com",
        databaseURL: "https://gaze-tracker-b39a8-default-rtdb.firebaseio.com",
        projectId: "gaze-tracker-b39a8",
        storageBucket: "gaze-tracker-b39a8.firebasestorage.app",
        messagingSenderId: "177766647597",
        appId: "1:177766647597:web:b50caaec3cb0784c9fb5a4",
        measurementId: "G-N6N4WPB86G"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const gyroDataRef = database.ref('angle');
    const defaultAnglesRef = database.ref('defaultAngles');
    const liveDataContainer = document.getElementById('live-data-container');
    const gazePatternContainer = document.getElementById('gaze-pattern-container');
    const gridItems = document.querySelectorAll('.grid-item');
    let currentHighlightedIndex = -1;
    let defaultAngles = {};
    let timers = {};
    let counts = {};
    let highlightedStates = {};
    let isTrackingActive = false; // Flag to track if tracking is active in the Gaze Tracker tab
    let isSetDefaultActive = false; // Flag for Set Default tab

    // Load recorded default angles from Firebase
    defaultAnglesRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            defaultAngles = snapshot.val();
        }
    });

    // Update live data and highlight corresponding grid
    gyroDataRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data && typeof data === 'object') {
                const x = data.x !== undefined ? Math.round(data.x) : 'N/A';
                const y = data.y !== undefined ? Math.round(data.y) : 'N/A';
                const z = data.z !== undefined ? Math.round(data.z) : 'N/A';
                liveDataContainer.innerHTML = `
                    <h2>Live Gyroscope Data</h2>
                    <p>X: ${x}&#176;</p>
                    <p>Y: ${y}&#176;</p>
                    <p>Z: ${z}&#176;</p>
                `;
                const gazePattern = identifyClosestGazePattern(x, y, z, defaultAngles);
                gazePatternContainer.innerHTML = `<h2>Gaze Pattern</h2><p>${gazePattern}</p>`;
                highlightGazePattern(gazePattern);
            } else {
                liveDataContainer.innerHTML = `<p>Unexpected data format received from Firebase.</p>`;
                gazePatternContainer.innerHTML = `<p>Unable to determine gaze pattern.</p>`;
            }
        } else {
            liveDataContainer.innerHTML = `<p>No data available</p>`;
            gazePatternContainer.innerHTML = `<p>No data available</p>`;
        }
    }, (error) => {
        liveDataContainer.innerHTML = `<p>Error retrieving data: ${error.message}</p>`;
        gazePatternContainer.innerHTML = `<p>Error retrieving gaze pattern data: ${error.message}</p>`;
    });

    // Function to determine the closest gaze pattern
    function identifyClosestGazePattern(x, y, z, defaultAngles) {
        if (Object.keys(defaultAngles).length === 0) {
            console.error("Default angles are empty.");
            return "Unknown";
        }
        let closestPattern = "Unknown";
        let smallestDistance = Infinity;

        for (const [pattern, angles] of Object.entries(defaultAngles)) {
            const distance = Math.sqrt((x - angles.x) ** 2 + (y - angles.y) ** 2 + (z - angles.z) ** 2);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestPattern = pattern;
            }
        }
        return closestPattern.replace(/-/g, ' ').toUpperCase();
    }

    // Function to highlight the grid item based on gaze pattern
    function highlightGazePattern(gazePattern) {
        if (!isTrackingActive) return; // Exit if tracking is not active in Gaze Tracker tab

        // Check if default angles are recorded
        if (Object.keys(defaultAngles).length === 0) {
            console.error("Default angles are not recorded.");
            return;
        }

        gridItems.forEach(item => {
            const label = item.querySelector('.label');
            const gridKey = item.dataset.gaze;
            const isHighlighted = label && label.textContent.trim().toUpperCase() === gazePattern.trim().toUpperCase();

            if (isHighlighted && !highlightedStates[gridKey]) {
                counts[gridKey] = (counts[gridKey] || 0) + 1;
                highlightedStates[gridKey] = true;
            } else if (!isHighlighted) {
                highlightedStates[gridKey] = false;
            }

            item.style.boxShadow = isHighlighted ? '0 0 15px 5px green' : 'none';

            const countRect = item.querySelector('.count-rect');
            const timeRect = item.querySelector('.time-rect');

            if (document.querySelector('.active').id === 'gaze-tracker-tab') {
                countRect.textContent = `Count: ${counts[gridKey] || 0}`;

                if (isHighlighted && !timers[gridKey]) {
                    timers[gridKey] = { startTime: Date.now(), interval: null };
                    timers[gridKey].interval = setInterval(() => {
                        const elapsedTime = Math.floor((Date.now() - timers[gridKey].startTime) / 1000);
                        timeRect.textContent = `Time: ${elapsedTime}s`;
                    }, 1000);
                } else if (!isHighlighted && timers[gridKey]) {
                    clearInterval(timers[gridKey].interval);
                    timers[gridKey] = null;
                }
            }

            countRect.style.display = document.querySelector('.active').id === 'gaze-tracker-tab' ? 'block' : 'none';
            timeRect.style.display = document.querySelector('.active').id === 'gaze-tracker-tab' ? 'block' : 'none';
        });
    }

    // Function to handle tab visibility for buttons
    function updateGridItemVisibility(tab) {
        gridItems.forEach(item => {
            const recordButton = item.querySelector('.record-button');
            const countRect = item.querySelector('.count-rect');
            const timeRect = item.querySelector('.time-rect');

            if (tab === 'about' || tab === 'setDefault') {
                if (recordButton) recordButton.style.display = tab === 'setDefault' ? 'block' : 'none';
                if (countRect) countRect.style.display = 'none';
                if (timeRect) timeRect.style.display = 'none';

                // Stop all timers when not in gazeTracker tab
                const gridKey = item.dataset.gaze;
                if (timers[gridKey]) {
                    clearInterval(timers[gridKey].interval);
                    timers[gridKey] = null;
                }
            } else if (tab === 'gazeTracker') {
                if (recordButton) recordButton.style.display = 'none';
                if (countRect) countRect.style.display = 'block';
                if (timeRect) timeRect.style.display = 'block';
            }
        });
    }

    // Button functionality
    const startButton = document.getElementById('start-button');
    const resetAllButton = document.getElementById('reset-all-button');
    const startGazeTrackingButton = document.getElementById('start-gaze-tracking-button');

    startButton.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
    });

    resetAllButton.addEventListener('click', () => {
        defaultAnglesRef.remove();
        gridItems.forEach(item => {
            const recordButton = item.querySelector('.record-button');
            if (recordButton) {
                recordButton.textContent = 'Record';
            }
        });
    });

    // Tab button functionality
    const aboutTab = document.getElementById('about-tab');
    const setDefaultTab = document.getElementById('set-default-tab');
    const gazeTrackerTab = document.getElementById('gaze-tracker-tab');

    aboutTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'block';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.remove('active');
        aboutTab.classList.add('active');
        updateGridItemVisibility('about');
    });

    setDefaultTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'block';
        setDefaultTab.classList.add('active');
        gazeTrackerTab.classList.remove('active');
        aboutTab.classList.remove('active');
        updateGridItemVisibility('setDefault');

        // Load and display recorded angles
        defaultAnglesRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                const angles = snapshot.val();
                gridItems.forEach(item => {
                    const gridKey = item.dataset.gaze;
                    const recordButton = item.querySelector('.record-button');
                    if (angles[gridKey] && recordButton) {
                        recordButton.textContent = `X=${angles[gridKey].x}, Y=${angles[gridKey].y}, Z=${angles[gridKey].z}`;
                    }
                });
            }
        });
    });

    gazeTrackerTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.add('active');
        aboutTab.classList.remove('active');
        updateGridItemVisibility('gazeTracker');
    });

    // Recording default angles functionality
    gridItems.forEach(item => {
        const recordButton = item.querySelector('.record-button');
        recordButton?.addEventListener('click', () => {
            if (recordButton.style.display === 'block') {
                gyroDataRef.once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        if (data && typeof data === 'object') {
                            const gridKey = item.dataset.gaze;
                            const angles = { x: Math.round(data.x), y: Math.round(data.y), z: Math.round(data.z) };
                            defaultAnglesRef.child(gridKey).set(angles);
                            recordButton.textContent = `X=${angles.x}, Y=${angles.y}, Z=${angles.z}`;
                        } else {
                            recordButton.textContent = 'Recording failed. Try again.';
                        }
                    }
                }, (error) => {
                    recordButton.textContent = `Error: ${error.message}`;
                });
            }
        });
    });

    // Start Gaze Tracking button functionality in Set Default tab
    startGazeTrackingButton.addEventListener('click', () => {
        isSetDefaultActive = true; // Enable Set Default tracking

        // Switch to Gaze Tracker tab
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.add('active');
        aboutTab.classList.remove('active');
        updateGridItemVisibility('gazeTracker');
    });

    const startTrackingButton = document.getElementById('start-button');
    const resetTrackingButton = document.getElementById('reset-button');

    // Start Tracking button functionality in Gaze Tracker tab
    startTrackingButton.addEventListener('click', () => {
        // Check if default angles are recorded
        if (Object.keys(defaultAngles).length === 0) {
            console.error("Default angles are not recorded. Timers will not start.");
            return;
        }

        isTrackingActive = true; // Enable tracking

        gridItems.forEach(item => {
            const gridKey = item.dataset.gaze;
            const timeRect = item.querySelector('.time-rect');
            const countRect = item.querySelector('.count-rect');

            // Initialize count
            counts[gridKey] = 0;
            countRect.textContent = `Count: ${counts[gridKey]}`;

            // Start timer
            if (!timers[gridKey]) {
                timers[gridKey] = { startTime: Date.now(), interval: null };
                timers[gridKey].interval = setInterval(() => {
                    const elapsedTime = Math.floor((Date.now() - timers[gridKey].startTime) / 1000);
                    timeRect.textContent = `Time: ${elapsedTime}s`;
                }, 1000);
            }
        });
    });

    // Reset Tracking button functionality
    resetTrackingButton.addEventListener('click', () => {
        isTrackingActive = false; // Disable tracking

        gridItems.forEach(item => {
            const gridKey = item.dataset.gaze;
            const timeRect = item.querySelector('.time-rect');
            const countRect = item.querySelector('.count-rect');

            // Reset count
            counts[gridKey] = 0;
            countRect.textContent = `Count: ${counts[gridKey]}`;

            // Reset timer
            if (timers[gridKey]) {
                clearInterval(timers[gridKey].interval);
                timers[gridKey] = null;
            }
            timeRect.textContent = `Time: 0s`;

            // Remove highlight
            item.style.boxShadow = 'none';
            highlightedStates[gridKey] = false;
        });
    });
});
