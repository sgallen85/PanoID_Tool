
        const iframe = document.getElementById('matterport-iframe');
        const sweepIdInput = document.getElementById('sweepId');
        const navigateButton = document.getElementById('navigateToSweep');
        const feedbackElement = document.getElementById('feedback');
        const currentSweepIdElement = document.getElementById('current-sweep-id');
        const legacySweepIdElement = document.getElementById('legacy-sweep-id');
        const idMapTableBody = document.querySelector('#id-map-table tbody');
        const currentSweepLabelElement = document.getElementById('current-sweep-label');

        // Legacy Navigation Elements
        const legacySweepIdInput = document.getElementById('legacySweepId');
        const navigateToLegacySweepButton = document.getElementById('navigateToLegacySweep');
        const legacyFeedbackElement = document.getElementById('legacyFeedback');

        // Model Change Elements
        const modelIdInput = document.getElementById('modelId');
        const changeModelButton = document.getElementById('changeModel');
        const modelFeedbackElement = document.getElementById('modelFeedback');

        let showcaseSdk = null;
        let idMap = null;
        let sweepLabels = {};
        let currentModelSid = 'as9m4eFKdE6'; // Initial model SID

        // **REPLACE WITH YOUR ACTUAL MATTERPORT SDK KEY**
        const sdkKey = '21bhgy7i4hrk6y6h43k30tf7a';

        // Replace with your Matterport Showcase URL (containing the model SID)
        let showcaseUrl = `https://my.matterport.com/show/?m=${currentModelSid}&qs=1&play=1`;

        iframe.src = showcaseUrl;

        iframe.onload = async () => {
            await initializeSdkAndData();
        };

        async function initializeSdkAndData() {
            try {
                showcaseSdk = await window.MP_SDK.connect(iframe, sdkKey, "");
                console.log('Matterport SDK connected:', showcaseSdk);

                const urlParams = new URLSearchParams(showcaseUrl.split('?')[1]);
                currentModelSid = urlParams.get('m');
                if (!currentModelSid) {
                    console.error('Model SID not found in the showcase URL.');
                    feedbackElement.textContent = 'Error: Model SID not found.';
                    return;
                }

                feedbackElement.textContent = 'Matterport Showcase loaded.';

                try {
                    idMap = await showcaseSdk.Sweep.Conversion.createIdMap();
                    console.log("ID Map created:", idMap);

                    // Fetch sweep labels using getLabelFromId
                    try {
                        for (const currentId in idMap) {
                            if (idMap.hasOwnProperty(currentId)) {
                                try {
                                    const label = await showcaseSdk.Sweep.Conversion.getLabelFromId(currentId);
                                    sweepLabels[currentId] = label || "N/A";
                                } catch (labelError) {
                                    console.error(`Error getting label for ${currentId}:`, labelError);
                                    sweepLabels[currentId] = "Error";
                                }
                            }
                        }
                        console.log("Sweep Labels:", sweepLabels);
                    } catch (labelFetchError) {
                        console.error("Error fetching sweep labels:", labelFetchError);
                        feedbackElement.textContent = "Error: Could not fetch sweep labels.";
                        sweepLabels = {};
                    }

		displayIdMapTable();

                } catch (mapError) {
                    console.error("Error creating ID map:", mapError);
                    feedbackElement.textContent = "Error: Could not create ID map.";
                    return;
                }

                if (showcaseSdk) {

			try {
			    const currentSweep = await showcaseSdk.Sweep.getCurrent();
 			   console.log("Initial current sweep:", currentSweep);
 			   if (currentSweep && currentSweep.id) {
  			      currentSweepIdElement.textContent = "Current Sweep ID: " + currentSweep.id;
  			      const legacyId = idMap[currentSweep.id] || "N/A";
  			      legacySweepIdElement.textContent = "Current Pano ID: " + legacyId;
  			      const currentLabel = await showcaseSdk.Sweep.Conversion.getLabelFromId(currentSweep.id);
  			      console.log("Label for current sweep:", currentLabel);
  			      currentSweepLabelElement.textContent = "Current Scan #: " + currentLabel;
   			 }
			} catch (error) {
			    console.error("Error in initial sweep fetch:", error);
			}

		}

		showcaseSdk.Sweep.current.subscribe(async currentSweep => {
		    console.log("Sweep changed to:", currentSweep);
		    if (currentSweep && currentSweep.id) {
		        currentSweepIdElement.textContent = "Current Sweep ID: " + currentSweep.id;
		        const legacyId = idMap[currentSweep.id] || "N/A";
		        legacySweepIdElement.textContent = "Current Pano ID: " + legacyId;
		        try {
		            const currentLabel = await showcaseSdk.Sweep.Conversion.getLabelFromId(currentSweep.id);
		            console.log("Updated sweep label:", currentLabel);
		            currentSweepLabelElement.textContent = "Current Scan #: " + currentLabel;
		        } catch (labelErr) {
		            console.error("Error fetching label during sweep change:", labelErr);
		        }
		    }
		});


		// Creat Downloadable CSV file from the sweep map table
		document.getElementById('exportCsvButton').addEventListener('click', () => {
		    const rows = [['Sweep #', 'Sweep ID', 'Pano ID']];

		    for (const currentId in idMap) {
		        if (idMap.hasOwnProperty(currentId)) {
		            const legacyId = idMap[currentId];
		            const label = sweepLabels[currentId] || 'N/A';
		            rows.push([label, currentId, legacyId]);
		        }
		    }

		    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
		    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		    const url = URL.createObjectURL(blob);

		    const link = document.createElement('a');
		    link.setAttribute('href', url);
		    const fileName = `sweep_id_map_${currentModelSid}.csv`;
		    link.setAttribute('download', fileName);
		    document.body.appendChild(link);
		    link.click();
		    document.body.removeChild(link);
		});





            } catch (e) {
                console.error('Error connecting to Matterport SDK:', e);
                feedbackElement.textContent = 'Error loading Matterport Showcase.';
            }
        }

        navigateButton.addEventListener('click', async () => {
            if (!showcaseSdk) {
                feedbackElement.textContent = 'Matterport Showcase not yet loaded.';
                return;
            }

            const sweepId = sweepIdInput.value.trim();
            if (!sweepId) {
                feedbackElement.textContent = 'Please enter a Sweep ID.';
                return;
            }

            try {
                await showcaseSdk.Sweep.moveTo(sweepId, {
                    transition: "transition.fly"
                });
                feedbackElement.textContent = `Navigated to sweep: ${sweepId}`;
            } catch (error) {
                console.error('Error navigating to sweep:', error);
                feedbackElement.textContent = `Error navigating to sweep: ${error.message || 'Invalid Sweep ID'}`;
            }
        });

  	function displayIdMapTable() {
            if (!idMap || Object.keys(idMap).length === 0) {
                idMapTableBody.innerHTML = '<tr><td colspan="3">No sweep ID conversions available.</td></tr>';
                return;
            }

            let tableRows = [];
            for (const currentId in idMap) {
                if (idMap.hasOwnProperty(currentId)) {
                    const legacyId = idMap[currentId];
                    const label = sweepLabels[currentId] || "N/A";
                    tableRows.push({ label: label, currentId: currentId, legacyId: legacyId });
                }
            }

            tableRows.sort((a, b) => {
                const labelA = a.label.toLowerCase();
                const labelB = b.label.toLowerCase();

                const extractNumber = (str) => {
                    const match = str.match(/(\d+)/);
                    return match ? parseInt(match[0], 10) : Infinity;
                };

                const numA = extractNumber(labelA);
                const numB = extractNumber(labelB);

                if (numA !== Infinity && numB !== Infinity) {
                    return numA - numB;
                } else if (numA === numB) {
                    return labelA.localeCompare(labelB);
                } else {
                    return numA === Infinity ? -1 : 1;
                }
            });

            let tableHTML = '';
            tableRows.forEach(row => {
                tableHTML += `<tr><td>${row.label}</td><td>${row.currentId}</td><td>${row.legacyId}</td></tr>`;
            });

            idMapTableBody.innerHTML = tableHTML;
        }

   // --- Legacy Navigation Functionality ---
        navigateToLegacySweepButton.addEventListener('click', async () => {
            if (!showcaseSdk) {
                legacyFeedbackElement.textContent = 'Matterport Showcase not yet loaded.';
                return;
            }

            const legacyId = legacySweepIdInput.value.trim();
            if (!legacyId) {
                legacyFeedbackElement.textContent = 'Please enter a Pano ID.';
                return;
            }

            // Reverse lookup in idMap
            let currentId = null;
            for (const curr in idMap) {
                if (idMap.hasOwnProperty(curr) && idMap[curr] === legacyId) {
                    currentId = curr;
                    break;
                }
            }

            if (!currentId) {
                legacyFeedbackElement.textContent = `Legacy Sweep ID "${legacyId}" not found.`;
                return;
            }

            try {
                await showcaseSdk.Sweep.moveTo(currentId, {
                    transition: "transition.fly"
                });
                legacyFeedbackElement.textContent = `Navigated to sweep with Legacy ID: ${legacyId}`;
            } catch (error) {
                console.error('Error navigating to sweep:', error);
                legacyFeedbackElement.textContent = `Error navigating: ${error.message || 'Invalid Sweep ID'}`;
            }
        });

        // --- Model Change Functionality ---
        changeModelButton.addEventListener('click', async () => {
            const newModelId = modelIdInput.value.trim();
            if (!newModelId) {
                modelFeedbackElement.textContent = 'Please enter a Model ID.';
                return;
            }

            currentModelSid = newModelId;
            showcaseUrl = `https://my.matterport.com/show/?m=${currentModelSid}&qs=1&play=1`;
            iframe.src = showcaseUrl; // Reload the iframe with the new model

            // Re-initialize SDK and data after model change
            iframe.onload = async () => {
                await initializeSdkAndData();
            };

            modelFeedbackElement.textContent = `Model changed to: ${newModelId}`;
        });

