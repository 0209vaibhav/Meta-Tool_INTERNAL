// Firebase configuration and initialization
// Instead of using import statements, load Firebase SDK using script tags in your HTML file

// Ensure the following scripts are included in your HTML file before this script runs:
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>

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

    // Reference to gyroscope data in Firebase
    const gyroDataRef = database.ref('angle');
    const defaultAnglesRef = database.ref('defaultAngles');

    // Get the live data container by its ID
    const liveDataContainer = document.getElementById('live-data-container');
    const gazePatternContainer = document.getElementById('gaze-pattern-container');

    // Get all grid items
    const gridItems = document.querySelectorAll('.grid-item');

    // Timer and count tracking
    let timerInterval = null;
    let currentHighlightedItem = null;
    const gridTimers = new Map(); // Map to store timers for each grid item
    const gridCounts = new Map(); // Map to store counts for each grid item

    gridItems.forEach(item => {
        gridTimers.set(item, 0);
        gridCounts.set(item, 0);

        // Add event listener for the record button
        const recordButton = item.querySelector('.record-button');
        if (recordButton) {
            recordButton.addEventListener('click', () => {
                const gazeKey = item.dataset.gaze;
                const newAngles = {
                    x: Math.round(Math.random() * 360 - 180), // Placeholder values; replace with actual angles
                    y: Math.round(Math.random() * 360 - 180),
                    z: Math.round(Math.random() * 360 - 180)
                };

                defaultAnglesRef.child(gazeKey).set(newAngles).then(() => {
                    recordButton.textContent = `X = ${newAngles.x}, Y = ${newAngles.y}, Z = ${newAngles.z}`;
                    console.log(`Default angles for ${gazeKey} recorded successfully!`);
                }).catch((error) => {
                    console.error("Error saving angles: ", error);
                });
            });
        }
    });

    // Keep track of the current highlighted grid item
    let defaultAngles = {};

    // Load recorded default angles from Firebase
    defaultAnglesRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            defaultAngles = snapshot.val();
        }
    });

    // Update the live data in the right-side container and highlight the corresponding grid
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

                // Determine which gaze pattern the angles match
                const gazePattern = identifyGazePattern(x, y, z, defaultAngles);
                highlightGazePattern(gazePattern);

                // Update gaze pattern container with real-time count and timer
                if (currentHighlightedItem) {
                    gazePatternContainer.innerHTML = `
                        <h2>Gaze Pattern</h2>
                        <p>${gazePattern}</p>
                        <p>Count: ${gridCounts.get(currentHighlightedItem) || 0}</p>
                        <p>Time: ${gridTimers.get(currentHighlightedItem) || 0}s</p>
                    `;
                }

                // Update all grid items with their respective timer and count
                gridItems.forEach(item => {
                    const countTimeLabel = item.querySelector('.count-time-label');
                    if (countTimeLabel) {
                        const time = gridTimers.get(item) || 0;
                        const count = gridCounts.get(item) || 0;
                        countTimeLabel.textContent = `Count: ${count} | Time: ${time}s`;
                    }
                });
            } else {
                liveDataContainer.innerHTML = `<p>Unexpected data format received from Firebase. Please verify the data structure in the database.</p>`;
                gazePatternContainer.innerHTML = `<p>Unable to determine gaze pattern due to incorrect data format.</p>`;
            }
        } else {
            liveDataContainer.innerHTML = `<p>No data available</p>`;
            gazePatternContainer.innerHTML = `<p>No data available</p>`;
        }
    }, (error) => {
        liveDataContainer.innerHTML = `<p>Error retrieving data from Firebase: ${error.message}</p>`;
        gazePatternContainer.innerHTML = `<p>Error retrieving gaze pattern data: ${error.message}</p>`;
    });

    // Function to determine which gaze pattern the angles match
    function identifyGazePattern(x, y, z, defaultAngles) {
        let closestPattern = "Unknown";
        let smallestDistance = Infinity;

        for (const [pattern, angles] of Object.entries(defaultAngles)) {
            const dx = x - angles.x;
            const dy = y - angles.y;
            const dz = z - angles.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestPattern = pattern;
            }
        }

        return closestPattern.replace(/-/g, ' ').toUpperCase();
    }

    // Function to highlight the grid item based on gaze pattern
    function highlightGazePattern(gazePattern) {
        let newHighlightedItem = null;

        gridItems.forEach(item => {
            const label = item.querySelector('.label');

            if (label && label.textContent.trim().toUpperCase() === gazePattern.trim().toUpperCase()) {
                item.style.boxShadow = '0 0 15px 5px green';
                newHighlightedItem = item;
            } else {
                item.style.boxShadow = 'none';
            }
        });

        if (newHighlightedItem !== currentHighlightedItem) {
            if (timerInterval) {
                clearInterval(timerInterval);
            }

            if (newHighlightedItem) {
                timerInterval = setInterval(() => {
                    const currentTime = gridTimers.get(newHighlightedItem) || 0;
                    gridTimers.set(newHighlightedItem, currentTime + 1);

                    const currentCount = gridCounts.get(newHighlightedItem) || 0;
                    gridCounts.set(newHighlightedItem, currentCount + 1);

                    // Update the bottom rectangle for real-time time and count
                    const countTimeLabel = newHighlightedItem.querySelector('.count-time-label');
                    if (countTimeLabel) {
                        countTimeLabel.textContent = `Count: ${currentCount} | Time: ${currentTime + 1}s`;
                    }

                    // Update the gaze pattern container
                    gazePatternContainer.innerHTML = `
                        <h2>Gaze Pattern</h2>
                        <p>${gazePattern}</p>
                        <p>Count: ${gridCounts.get(newHighlightedItem) || 0}</p>
                        <p>Time: ${gridTimers.get(newHighlightedItem) || 0}s</p>
                    `;

                    // Update all grid items with their respective timer and count
                    gridItems.forEach(item => {
                        const countTimeLabel = item.querySelector('.count-time-label');
                        if (countTimeLabel) {
                            const time = gridTimers.get(item) || 0;
                            const count = gridCounts.get(item) || 0;
                            countTimeLabel.textContent = `Count: ${count} | Time: ${time}s`;
                        }
                    });
                }, 1000);
            }

            currentHighlightedItem = newHighlightedItem;
        }
    }

    // Function to update timer display for a grid item
    function updateTimerDisplay(item) {
        const countLabel = item.querySelector('.count-time-label');
        if (countLabel) {
            const time = gridTimers.get(item) || 0;
            const count = gridCounts.get(item) || 0;
            countLabel.textContent = `Count: ${count} | Time: ${time}s`;
        }
    }

    // Function to handle tab visibility for buttons
    function updateGridItemVisibility(tab) {
        gridItems.forEach(item => {
            const countLabel = item.querySelector('.count-time-label, .record-button');

            if (tab === 'about') {
                countLabel.style.display = 'none';
                countLabel.textContent = '';
            } else if (tab === 'setDefault') {
                countLabel.style.display = 'block';
                countLabel.textContent = 'Record';
                countLabel.dataset.activeTab = 'setDefault';
            } else if (tab === 'gazeTracker') {
                countLabel.style.display = 'block';
                const countValue = gridCounts.get(item) || 0;
                const timeValue = gridTimers.get(item) || 0;
                countLabel.textContent = `Count: ${countValue} | Time: ${timeValue}s`;
            }
        });
    }

    const startButton = document.getElementById('start-button');
    const resetButton = document.getElementById('reset-button');
    const resetAllButton = document.getElementById('reset-all-button');

    startButton.addEventListener('click', () => {
        if (currentHighlightedItem && !timerInterval) {
            timerInterval = setInterval(() => {
                const currentTime = gridTimers.get(currentHighlightedItem) || 0;
                gridTimers.set(currentHighlightedItem, currentTime + 1);
                updateTimerDisplay(currentHighlightedItem);
            }, 1000);
        }
    });

    resetButton.addEventListener('click', () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        gridItems.forEach(item => {
            gridTimers.set(item, 0);
            gridCounts.set(item, 0);
            updateTimerDisplay(item);
        });

        currentHighlightedItem = null;
    });

    // Add reset-all button functionality in Set Default tab
    resetAllButton.addEventListener('click', () => {
        defaultAnglesRef.remove();
        gridItems.forEach(item => {
            const recordButton = item.querySelector('.record-button');
            if (recordButton) {
                recordButton.textContent = 'Record';
            }
        });
    });

    // Add functionality to tab buttons
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

    // Add functionality for "Start Gaze Tracking" button in Set Default tab
    const startGazeTrackingButton = document.getElementById('start-gaze-tracking-button');
    startGazeTrackingButton.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        setDefaultTab.classList.remove('active');
        gazeTrackerTab.classList.add('active');
        aboutTab.classList.remove('active');

        updateGridItemVisibility('gazeTracker');
    });
});
