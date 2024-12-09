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

    // Keep track of the current highlighted grid item
    let currentHighlightedIndex = -1;
    let defaultAngles = {};

    // Load recorded default angles from Firebase
    defaultAnglesRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            defaultAngles = snapshot.val();
        }
    });

    // Initialize count and timer for each grid item
    const gridTimers = new Map();
    gridItems.forEach(item => {
        const countLabel = document.createElement('div');
        countLabel.classList.add('count-time-label');
        countLabel.textContent = 'Count: 0 | Time: 0s';
        item.appendChild(countLabel);

        const recordButton = document.createElement('div');
        recordButton.classList.add('record-button');
        recordButton.textContent = 'Record';
        recordButton.style.display = 'none';
        item.appendChild(recordButton);

        recordButton.addEventListener('click', () => {
            console.log('Record button clicked for:', item.querySelector('.label').textContent.trim());
            gyroDataRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    console.log('Gyro data received:', data);
                    if (data && typeof data === 'object') {
                        const x = Math.round(data.x);
                        const y = Math.round(data.y);
                        const z = Math.round(data.z);
                        const gazePattern = item.querySelector('.label').textContent.trim().toUpperCase();
                        console.log(`Setting default angles for ${gazePattern}: X=${x}, Y=${y}, Z=${z}`);
                        defaultAnglesRef.child(gazePattern).set({ x, y, z })
                            .then(() => {
                                recordButton.textContent = `X: ${x}, Y: ${y}, Z: ${z}`;
                                console.log(`Default angles set successfully for ${gazePattern}`);
                            })
                            .catch((error) => {
                                console.error('Error setting default angles:', error);
                                recordButton.textContent = 'Error';
                            });
                    } else {
                        console.error('Invalid gyroscope data format.');
                        recordButton.textContent = 'Invalid Data';
                    }
                } else {
                    console.error('No gyroscope data found.');
                    recordButton.textContent = 'No Data';
                }
            });
        });

        gridTimers.set(item, { count: 0, timer: 0, interval: null, highlighted: false });
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

                // Determine the closest gaze pattern and highlight it
                const gazePattern = identifyClosestGazePattern(x, y, z, defaultAngles);
                gazePatternContainer.innerHTML = `
                    <h2>Gaze Pattern</h2>
                    <p>${gazePattern}</p>
                `;

                // Highlight corresponding grid item
                highlightGazePattern(gazePattern);
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

    // Function to determine the closest gaze pattern based on live gyroscope data
    function identifyClosestGazePattern(x, y, z, defaultAngles) {
        if (Object.keys(defaultAngles).length === 0) {
            console.error("Default angles are empty. Please record angles in Set Default tab.");
            return "Unknown";
        }

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
        gridItems.forEach(item => {
            const label = item.querySelector('.label');
            const countLabel = item.querySelector('.count-time-label');
            const gridData = gridTimers.get(item);

            if (label && label.textContent.trim().toUpperCase() === gazePattern.trim().toUpperCase()) {
                item.style.boxShadow = '0 0 15px 5px green';

                if (!gridData.highlighted) {
                    gridData.count++;
                    gridData.highlighted = true;
                    countLabel.textContent = `Count: ${gridData.count} | Time: ${gridData.timer}s`;
                }

                if (!gridData.interval) {
                    gridData.interval = setInterval(() => {
                        gridData.timer++;
                        countLabel.textContent = `Count: ${gridData.count} | Time: ${gridData.timer}s`;
                    }, 1000);
                }
            } else {
                item.style.boxShadow = 'none';
                gridData.highlighted = false;
                if (gridData.interval) {
                    clearInterval(gridData.interval);
                    gridData.interval = null;
                }
            }
        });
    }

    // Function to handle tab visibility for buttons
    function updateGridItemVisibility(tab) {
        gridItems.forEach(item => {
            const countLabel = item.querySelector('.count-time-label');
            const recordButton = item.querySelector('.record-button');

            // Adjust based on the active tab
            if (tab === 'about') {
                countLabel.style.display = 'none';
                recordButton.style.display = 'none';
            } else if (tab === 'setDefault') {
                countLabel.style.display = 'none';
                recordButton.style.display = 'block';
            } else if (tab === 'gazeTracker') {
                countLabel.style.display = 'block';
                recordButton.style.display = 'none';
            }
        });
    }

    // Add functionality to tab buttons
    const aboutTab = document.getElementById('about-tab');
    const setDefaultTab = document.getElementById('set-default-tab');
    const gazeTrackerTab = document.getElementById('gaze-tracker-tab');

    aboutTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'block';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'none';
        updateGridItemVisibility('about');
    });

    setDefaultTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'none';
        document.getElementById('set-default-container').style.display = 'block';
        updateGridItemVisibility('setDefault');
    });

    gazeTrackerTab.addEventListener('click', () => {
        document.getElementById('about-container').style.display = 'none';
        document.getElementById('gaze-tracker-container').style.display = 'block';
        document.getElementById('set-default-container').style.display = 'none';
        updateGridItemVisibility('gazeTracker');
    });
});
