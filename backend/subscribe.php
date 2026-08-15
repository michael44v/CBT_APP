<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fillop CBT Guru - Online Subscription & Passcode Purchase</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #1d3090;
            --primary-dark: #121e5f;
            --surface: #ffffff;
            --bg: #f4f6fb;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --success: #10b981;
            --warning: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg); color: var(--text); padding: 40px 20px; min-height: 100vh; }
        .container { max-width: 720px; margin: 0 auto; background: var(--surface); padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid var(--border); }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 70px; height: 70px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 16px; }
        h1 { font-size: 26px; font-weight: 800; color: var(--primary); margin-bottom: 8px; }
        p.subtitle { color: var(--text-muted); font-size: 14px; }

        .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin: 24px 0 12px; }

        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        input[type="text"], input[type="email"], select { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border); font-size: 14px; outline: none; transition: border-color 0.2s; }
        input:focus, select:focus { border-color: var(--primary); }

        .category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .category-card { border: 2px solid var(--border); padding: 14px; border-radius: 12px; text-align: center; cursor: pointer; font-weight: 700; transition: all 0.2s; font-size: 14px; }
        .category-card.active { border-color: var(--primary); background-color: rgba(29, 48, 144, 0.08); color: var(--primary); }

        .card-container { display: flex; flexDirection: column; gap: 20px; }
        .exam-subject-card { background: var(--bg); border: 2px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; transition: all 0.3s ease; }
        .exam-subject-card.disabled-card { opacity: 0.5; pointer-events: none; filter: grayscale(0.6); }
        .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; }
        .card-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 800; color: var(--primary); }
        .card-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(29, 48, 144, 0.1); color: var(--primary); }

        .subjects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .subject-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; cursor: pointer; background: var(--surface); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); transition: border-color 0.2s; }
        .subject-item:hover { border-color: var(--primary); }
        .subject-item input { width: 18px; height: 18px; accent-color: var(--primary); }

        .summary-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin: 28px 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: var(--text-muted); }
        .summary-row.total { font-size: 20px; font-weight: 800; color: var(--primary); border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px; }

        .btn { width: 100%; padding: 16px; border-radius: 12px; background: var(--primary); color: white; font-size: 16px; font-weight: 700; border: none; cursor: pointer; transition: background 0.2s; }
        .btn:hover { background: var(--primary-dark); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1000; }
        .modal { background: white; padding: 36px; border-radius: 20px; max-width: 440px; width: 100%; text-align: center; }
        .passcode-badge { font-size: 28px; font-weight: 900; font-family: monospace; letter-spacing: 2px; color: var(--primary); background: #e0e7ff; padding: 12px; border-radius: 10px; margin: 16px 0; border: 2px dashed var(--primary); }
        .notice { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5; }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <img src="/fillop/icon.png" class="logo" alt="Fillop CBT Logo" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%231d3090\'><circle cx=\'12\' cy=\'12\' r=\'10\'/></svg>'">
        <h1>Fillop CBT Guru Passcode Subscription</h1>
        <p class="subtitle">Customize your examination category and subject combination</p>
    </div>

    <form id="subscribeForm">
        <div class="form-group">
            <label>1. Candidate Details</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <input type="text" id="candName" placeholder="Full Name" required>
                <input type="email" id="candEmail" placeholder="Email Address" required>
            </div>
        </div>

        <div class="form-group">
            <label>2. Choose Examination Category</label>
            <div class="category-grid">
                <div class="category-card active" data-cat="JAMB" onclick="selectCategory('JAMB')">JAMB</div>
                <div class="category-card" data-cat="WAEC" onclick="selectCategory('WAEC')">WAEC</div>
                <div class="category-card" data-cat="NECO" onclick="selectCategory('NECO')">NECO</div>
                <div class="category-card" data-cat="ALL" onclick="selectCategory('ALL')">ALL (J/W/N)</div>
            </div>
        </div>

        <div class="form-group">
            <label style="margin-bottom: 16px;">3. Select Subjects per Exam Card (<span id="subjRulesNotice">JAMB requires 4 to 5 subjects</span>)</label>

            <!-- JAMB Subject Card -->
            <div class="exam-subject-card" id="cardJAMB">
                <div class="card-header">
                    <div class="card-title">
                        <img src="/fillop/jamb.webp" alt="JAMB Logo" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.display='none'">
                        <span>JAMB UTME Subjects</span>
                    </div>
                    <span class="card-badge">Min 4 — Max 5 Subjects</span>
                </div>
                <div class="subjects-grid" id="gridJAMB"></div>
            </div>

            <!-- WAEC Subject Card -->
            <div class="exam-subject-card disabled-card" id="cardWAEC">
                <div class="card-header">
                    <div class="card-title">
                        <img src="/fillop/waec.webp" alt="WAEC Logo" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.display='none'">
                        <span>WAEC SSCE Subjects</span>
                    </div>
                    <span class="card-badge">Min 4 — Max 9 Subjects</span>
                </div>
                <div class="subjects-grid" id="gridWAEC"></div>
            </div>

            <!-- NECO Subject Card -->
            <div class="exam-subject-card disabled-card" id="cardNECO">
                <div class="card-header">
                    <div class="card-title">
                        <img src="/fillop/NECO.jpg" alt="NECO Logo" style="width: 24px; height: 24px; object-fit: contain;" onerror="this.style.display='none'">
                        <span>NECO SSCE Subjects</span>
                    </div>
                    <span class="card-badge">Min 4 — Max 9 Subjects</span>
                </div>
                <div class="subjects-grid" id="gridNECO"></div>
            </div>
        </div>

        <div class="form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
                <label>4. Duration (Months)</label>
                <select id="durationMonths" onchange="calculateTotal()">
                    <option value="1">1 Month</option>
                    <option value="3" selected>3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months (1 Year)</option>
                </select>
            </div>
            <div>
                <label>5. Allowed Devices / Seats</label>
                <select id="maxDevices" onchange="calculateTotal()">
                    <option value="1" selected>1 Device Terminal</option>
                    <option value="2">2 Devices</option>
                    <option value="5">5 Devices (School/Group)</option>
                    <option value="10">10 Devices</option>
                </select>
            </div>
        </div>

        <div class="summary-box">
            <div class="summary-row"><span>Exam Category Base (₦500/cat):</span> <strong id="sumCat">₦500</strong></div>
            <div class="summary-row"><span>Subject Combination (₦300/subj):</span> <strong id="sumSubj">₦1,200</strong></div>
            <div class="summary-row"><span>Duration Fee (₦100/mo):</span> <strong id="sumDur">₦300</strong></div>
            <div class="summary-row"><span>Device Terminal Slots (₦100/dev):</span> <strong id="sumDev">₦100</strong></div>
            <div class="summary-row total"><span>Total Payable:</span> <strong id="sumTotal">₦2,100</strong></div>
        </div>

        <button type="submit" class="btn" id="payBtn" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>Pay Now with Paystack (Simulated)</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        </button>
    </form>
</div>

<!-- Modal for Payment Success & Passcode Generation -->
<div class="modal-overlay" id="successModal">
    <div class="modal">
        <div style="display: flex; justify-content: center; margin-bottom: 12px; color: var(--success);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: var(--primary);">Passcode Generated!</h2>
        <p style="font-size: 14px; color: var(--text-muted); margin-top: 6px;">
            Copy this unique passcode and enter it in your Fillop CBT Guru Desktop App to activate your terminal.
        </p>

        <div class="passcode-badge" id="generatedPasscode">GP-XXXX-XXXX</div>

        <div class="notice">
            Email: <strong id="resEmail">user@example.com</strong><br>
            Category: <strong id="resCat">JAMB</strong> • Subjects: <strong id="resSubjs">Mathematics, English...</strong>
        </div>

        <button class="btn" onclick="window.location.reload()">Done / Purchase Another</button>
    </div>
</div>

<script>
    // Database subjects structure mapped to subjects table
    const dbSubjectsMap = {
        JAMB: [
            { id: 1, name: "Mathematics" },
            { id: 2, name: "English" },
            { id: 3, name: "Physics" },
            { id: 4, name: "Chemistry" },
            { id: 5, name: "Biology" },
            { id: 6, name: "Economics" },
            { id: 7, name: "Government" },
            { id: 8, name: "Literature" }
        ],
        WAEC: [
            { id: 9, name: "Mathematics" },
            { id: 10, name: "English" },
            { id: 11, name: "Physics" },
            { id: 12, name: "Chemistry" },
            { id: 13, name: "Biology" },
            { id: 14, name: "Economics" },
            { id: 15, name: "Government" },
            { id: 16, name: "Literature" }
        ],
        NECO: [
            { id: 17, name: "Mathematics" },
            { id: 18, name: "English" },
            { id: 19, name: "Physics" },
            { id: 20, name: "Chemistry" },
            { id: 21, name: "Biology" },
            { id: 22, name: "Economics" },
            { id: 23, name: "Government" },
            { id: 24, name: "Literature" }
        ]
    };

    let currentCategory = "JAMB";

    function renderSubjects() {
        ["JAMB", "WAEC", "NECO"].forEach(cat => {
            const grid = document.getElementById(`grid${cat}`);
            grid.innerHTML = "";
            dbSubjectsMap[cat].forEach(sub => {
                const label = document.createElement("label");
                label.className = "subject-item";
                const isDefaultCore = (sub.name === "Mathematics" || sub.name === "English" || sub.name === "Physics" || sub.name === "Chemistry");
                const checked = (cat === "JAMB" && isDefaultCore) ? "checked" : "";

                label.innerHTML = `<input type="checkbox" name="subj_${cat}" value="${sub.id}" data-name="${sub.name}" ${checked} onchange="calculateTotal()"> ${sub.name}`;
                grid.appendChild(label);
            });
        });

        updateCardsVisibility();
    }

    function selectCategory(cat) {
        currentCategory = cat;
        document.querySelectorAll(".category-card").forEach(c => {
            c.classList.toggle("active", c.getAttribute("data-cat") === cat);
        });
        updateCardsVisibility();
        calculateTotal();
    }

    function updateCardsVisibility() {
        const notice = document.getElementById("subjRulesNotice");
        const cardJ = document.getElementById("cardJAMB");
        const cardW = document.getElementById("cardWAEC");
        const cardN = document.getElementById("cardNECO");

        if (currentCategory === "JAMB") {
            notice.innerText = "JAMB requires 4 to 5 subjects";
            cardJ.classList.remove("disabled-card");
            cardW.classList.add("disabled-card");
            cardN.classList.add("disabled-card");
        } else if (currentCategory === "WAEC") {
            notice.innerText = "WAEC requires 4 to 9 subjects";
            cardJ.classList.add("disabled-card");
            cardW.classList.remove("disabled-card");
            cardN.classList.add("disabled-card");
        } else if (currentCategory === "NECO") {
            notice.innerText = "NECO requires 4 to 9 subjects";
            cardJ.classList.add("disabled-card");
            cardW.classList.add("disabled-card");
            cardN.classList.remove("disabled-card");
        } else if (currentCategory === "ALL") {
            notice.innerText = "Select subjects for JAMB (4-5), WAEC (4-9) & NECO (4-9)";
            cardJ.classList.remove("disabled-card");
            cardW.classList.remove("disabled-card");
            cardN.classList.remove("disabled-card");
        }
    }

    function getSelectedSubjectsByCard() {
        const result = { JAMB: [], WAEC: [], NECO: [], allSelectedIds: [], allSelectedNames: [] };

        ["JAMB", "WAEC", "NECO"].forEach(cat => {
            if (currentCategory === "ALL" || currentCategory === cat) {
                const checked = Array.from(document.querySelectorAll(`input[name="subj_${cat}"]:checked`));
                checked.forEach(cb => {
                    const id = cb.value;
                    const name = cb.getAttribute("data-name");
                    result[cat].push({ id, name });
                    result.allSelectedIds.push(id);
                    result.allSelectedNames.push(`${cat}: ${name}`);
                });
            }
        });

        return result;
    }

    function calculateTotal() {
        const selections = getSelectedSubjectsByCard();
        const totalNumSubjs = selections.allSelectedIds.length;
        const months = parseInt(document.getElementById("durationMonths").value) || 1;
        const devices = parseInt(document.getElementById("maxDevices").value) || 1;

        const numCats = (currentCategory === "ALL") ? 3 : 1;
        const catCost = numCats * 500;
        const subjCost = totalNumSubjs * 300;
        const durCost = months * 100;
        const devCost = devices * 100;

        const total = catCost + subjCost + durCost + devCost;

        document.getElementById("sumCat").innerText = `₦${catCost.toLocaleString()}`;
        document.getElementById("sumSubj").innerText = `₦${subjCost.toLocaleString()}`;
        document.getElementById("sumDur").innerText = `₦${durCost.toLocaleString()}`;
        document.getElementById("sumDev").innerText = `₦${devCost.toLocaleString()}`;
        document.getElementById("sumTotal").innerText = `₦${total.toLocaleString()}`;

        return { totalNumSubjs, selections, total };
    }

    document.getElementById("subscribeForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("candName").value.trim();
        const email = document.getElementById("candEmail").value.trim();
        const { totalNumSubjs, selections, total } = calculateTotal();

        if (currentCategory === "JAMB") {
            const cnt = selections.JAMB.length;
            if (cnt < 4 || cnt > 5) {
                alert("JAMB card requires a minimum of 4 subjects and a maximum of 5 subjects.");
                return;
            }
        } else if (currentCategory === "WAEC") {
            const cnt = selections.WAEC.length;
            if (cnt < 4 || cnt > 9) {
                alert("WAEC card requires a minimum of 4 subjects and a maximum of 9 subjects.");
                return;
            }
        } else if (currentCategory === "NECO") {
            const cnt = selections.NECO.length;
            if (cnt < 4 || cnt > 9) {
                alert("NECO card requires a minimum of 4 subjects and a maximum of 9 subjects.");
                return;
            }
        } else if (currentCategory === "ALL") {
            const jCnt = selections.JAMB.length;
            const wCnt = selections.WAEC.length;
            const nCnt = selections.NECO.length;
            if (jCnt < 4 || jCnt > 5) {
                alert("JAMB subject card requires a minimum of 4 subjects and a maximum of 5 subjects.");
                return;
            }
            if (wCnt < 4 || wCnt > 9) {
                alert("WAEC subject card requires a minimum of 4 subjects and a maximum of 9 subjects.");
                return;
            }
            if (nCnt < 4 || nCnt > 9) {
                alert("NECO subject card requires a minimum of 4 subjects and a maximum of 9 subjects.");
                return;
            }
        }

        const btn = document.getElementById("payBtn");
        btn.disabled = true;
        btn.innerText = "Processing Payment Gateway...";

        try {
            const res = await fetch("/fillop/api/v1/register.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    exam_category: currentCategory,
                    selected_subjects: selections.allSelectedIds,
                    category_subjects: {
                        JAMB: selections.JAMB.map(s => s.id),
                        WAEC: selections.WAEC.map(s => s.id),
                        NECO: selections.NECO.map(s => s.id)
                    },
                    max_devices: parseInt(document.getElementById("maxDevices").value),
                    duration_months: parseInt(document.getElementById("durationMonths").value)
                })
            });
            const data = await res.json();

            if (data.success && data.reference) {
                // Simulate Paystack verification
                const vRes = await fetch("/fillop/api/v1/payments/verify.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference: data.reference })
                });
                const vData = await vRes.json();

                if (vData.success) {
                    document.getElementById("generatedPasscode").innerText = vData.passcode;
                    document.getElementById("resEmail").innerText = vData.email;
                    document.getElementById("resCat").innerText = vData.exam_category;
                    document.getElementById("resSubjs").innerText = vData.allowed_subjects;
                    document.getElementById("successModal").style.display = "flex";
                } else {
                    alert(vData.message || "Payment verification failed.");
                }
            } else {
                alert(data.message || "Initialization failed.");
            }
        } catch (err) {
            alert("Connection error: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Pay Now with Paystack (Simulated)</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
        }
    });

    renderSubjects();
    calculateTotal();
</script>
</body>
</html>
