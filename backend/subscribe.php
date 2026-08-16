<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fillop CBT Guru - Category Subscription & Bulk Licensing</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
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
        .container { max-width: 800px; margin: 0 auto; background: var(--surface); padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid var(--border); }
        .header { text-align: center; margin-bottom: 32px; }
        .logo { width: 70px; height: 70px; border-radius: 50%; border: 3px solid var(--primary); margin-bottom: 16px; }
        h1 { font-size: 26px; font-weight: 800; color: var(--primary); margin-bottom: 8px; }
        p.subtitle { color: var(--text-muted); font-size: 14px; }

        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--primary); margin: 28px 0 12px; border-bottom: 2px solid var(--bg); padding-bottom: 6px; }

        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        input[type="text"], input[type="email"], input[type="number"], input[type="tel"], select { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border); font-size: 14px; outline: none; transition: border-color 0.2s; background: #fff; }
        input:focus, select:focus { border-color: var(--primary); }

        .category-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .category-checkbox-card { border: 2px solid var(--border); padding: 18px; border-radius: 14px; cursor: pointer; text-align: center; transition: all 0.2s; background: #f8fafc; }
        .category-checkbox-card.selected { border-color: var(--primary); background-color: rgba(29, 48, 144, 0.08); }
        .category-checkbox-card input { display: none; }
        .cat-name { font-size: 16px; font-weight: 800; color: var(--primary); margin-bottom: 4px; }
        .cat-desc { font-size: 12px; color: var(--text-muted); }

        .exam-subject-card { background: var(--bg); border: 2px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; display: none; }
        .exam-subject-card.active-card { display: block; }
        .card-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; }
        .card-title { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 800; color: var(--primary); }
        .card-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px; background: rgba(29, 48, 144, 0.1); color: var(--primary); }

        .subjects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .subject-item { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500; cursor: pointer; background: var(--surface); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); transition: border-color 0.2s; }
        .subject-item:hover { border-color: var(--primary); }
        .subject-item input { width: 18px; height: 18px; accent-color: var(--primary); }

        .pricing-tier-notice { background: #e0e7ff; border-left: 4px solid var(--primary); padding: 12px 16px; border-radius: 8px; font-size: 13px; color: var(--primary-dark); margin-bottom: 20px; line-height: 1.5; }

        .summary-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin: 28px 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: var(--text-muted); }
        .summary-row.total { font-size: 20px; font-weight: 800; color: var(--primary); border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px; }

        .btn { width: 100%; padding: 16px; border-radius: 12px; background: var(--primary); color: white; font-size: 16px; font-weight: 700; border: none; cursor: pointer; transition: background 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn:hover { background: var(--primary-dark); }
        .btn-secondary { background: #64748b; }
        .btn-secondary:hover { background: #475569; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: none; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal { background: white; padding: 36px; border-radius: 20px; max-width: 600px; width: 100%; text-align: center; max-height: 90vh; overflow-y: auto; }
        .passcode-list-box { background: #e0e7ff; border: 2px dashed var(--primary); border-radius: 12px; padding: 16px; margin: 16px 0; max-height: 200px; overflow-y: auto; text-align: left; }
        .passcode-item { font-family: monospace; font-size: 16px; font-weight: 800; color: var(--primary); padding: 6px 0; border-bottom: 1px solid rgba(29,48,144,0.1); }
        .export-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .export-btn { flex: 1; padding: 12px; font-size: 13px; font-weight: 700; border-radius: 10px; border: 1px solid var(--border); background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .export-btn:hover { background: #e2e8f0; }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <img src="/fillop/icon.png" class="logo" alt="Fillop CBT Logo" onerror="this.src='data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%231d3090\'><circle cx=\'12\' cy=\'12\' r=\'10\'/></svg>'">
        <h1>Fillop CBT Guru Subscription &amp; Licensing</h1>
        <p class="subtitle">Individual, Multi-Category, Subject Activation &amp; Bulk Passcode Portal</p>
    </div>

    <form id="subscribeForm">
        <div class="section-title">1. Contact &amp; Organization Details</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="form-group">
                <label>Contact Person Name *</label>
                <input type="text" id="candName" placeholder="Full Name" required>
            </div>
            <div class="form-group">
                <label>Email Address *</label>
                <input type="email" id="candEmail" placeholder="user@example.com" required>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" id="candPhone" placeholder="08012345678" required>
            </div>
            <div class="form-group">
                <label>Organization Type</label>
                <select id="orgType">
                    <option value="Individual">Individual Candidate</option>
                    <option value="Secondary School">Secondary School</option>
                    <option value="Tutorial Centre">Tutorial Centre</option>
                    <option value="University">University</option>
                    <option value="Polytechnic">Polytechnic</option>
                    <option value="College of Education">College of Education</option>
                    <option value="Government Agency">Government Agency</option>
                    <option value="NGO">NGO</option>
                    <option value="Scholarship Program">Scholarship Program</option>
                    <option value="Educational Foundation">Educational Foundation</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Organization / School Name (Required for Bulk Purchases)</label>
            <input type="text" id="orgName" placeholder="e.g. Bright Stars College / Fillop Tutorial Center">
        </div>

        <div class="section-title">2. Select Examination Categories (Cart)</div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Select one or multiple examination categories to add them to your subscription cart.</p>
        <div class="category-select-grid">
            <div class="category-checkbox-card selected" id="cardCatJAMB" onclick="toggleCategoryCard('JAMB')">
                <input type="checkbox" id="chkCatJAMB" checked>
                <div class="cat-name">JAMB UTME</div>
                <div class="cat-desc">Min 4 — Max 5 Subjects</div>
            </div>
            <div class="category-checkbox-card" id="cardCatWAEC" onclick="toggleCategoryCard('WAEC')">
                <input type="checkbox" id="chkCatWAEC">
                <div class="cat-name">WAEC SSCE</div>
                <div class="cat-desc">Min 4 — Max 9 Subjects</div>
            </div>
            <div class="category-checkbox-card" id="cardCatNECO" onclick="toggleCategoryCard('NECO')">
                <input type="checkbox" id="chkCatNECO">
                <div class="cat-name">NECO SSCE</div>
                <div class="cat-desc">Min 4 — Max 9 Subjects</div>
            </div>
        </div>

        <div class="section-title">3. Subject Selection per Category</div>

        <!-- JAMB Subject Panel -->
        <div class="exam-subject-card active-card" id="panelJAMB">
            <div class="card-header">
                <div class="card-title">
                    <span>JAMB UTME Subjects</span>
                </div>
                <span class="card-badge">Min 4 — Max 5 Subjects</span>
            </div>
            <div class="subjects-grid" id="gridJAMB"></div>
        </div>

        <!-- WAEC Subject Panel -->
        <div class="exam-subject-card" id="panelWAEC">
            <div class="card-header">
                <div class="card-title">
                    <span>WAEC SSCE Subjects</span>
                </div>
                <span class="card-badge">Min 4 — Max 9 Subjects</span>
            </div>
            <div class="subjects-grid" id="gridWAEC"></div>
        </div>

        <!-- NECO Subject Panel -->
        <div class="exam-subject-card" id="panelNECO">
            <div class="card-header">
                <div class="card-title">
                    <span>NECO SSCE Subjects</span>
                </div>
                <span class="card-badge">Min 4 — Max 9 Subjects</span>
            </div>
            <div class="subjects-grid" id="gridNECO"></div>
        </div>

        <div class="section-title">4. Subscription Quantity &amp; Duration</div>
        <div class="pricing-tier-notice" id="tierNotice">
            Loading current pricing tiers...
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
            <div class="form-group">
                <label>Passcode Quantity *</label>
                <input type="number" id="passcodeQty" min="1" max="1000" value="1" onchange="calculateTotal()" oninput="calculateTotal()" required>
            </div>
            <div class="form-group">
                <label>Subscription Duration *</label>
                <select id="subDuration" onchange="calculateTotal()">
                    <option value="6" selected>6 Months (Default)</option>
                    <option value="12">1 Year (6 Months Price × 2)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Allowed Seats / Devices per Code</label>
                <input type="number" id="maxDevices" min="1" max="100" value="1" onchange="calculateTotal()">
            </div>
        </div>

        <div class="summary-box">
            <div class="summary-row"><span>Unit Price per Passcode (6m Base):</span> <strong id="sumUnitPrice">₦1,400</strong></div>
            <div class="summary-row"><span>Selected Categories Count:</span> <strong id="sumCatCount">1 Category</strong></div>
            <div class="summary-row"><span>Duration Multiplier:</span> <strong id="sumDurMult">1.0× (6 Months)</strong></div>
            <div class="summary-row"><span>Quantity:</span> <strong id="sumQty">1 Passcode</strong></div>
            <div class="summary-row total"><span>Total Payable Amount:</span> <strong id="sumTotal">₦1,400</strong></div>
        </div>

        <button type="submit" class="btn" id="payBtn">
            <span>Pay &amp; Generate Passcodes</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
        </button>
    </form>
</div>

<!-- Modal for Payment Success & Passcode Distribution -->
<div class="modal-overlay" id="successModal">
    <div class="modal">
        <div style="display: flex; justify-content: center; margin-bottom: 12px; color: var(--success);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <h2 style="font-size: 22px; font-weight: 800; color: var(--primary);">Passcodes Generated!</h2>
        <p style="font-size: 14px; color: var(--text-muted); margin-top: 6px;">
            Your purchase is complete. Enter the passcode(s) in Fillop CBT Guru Desktop App to unlock access.
        </p>

        <div class="passcode-list-box" id="passcodeListContainer"></div>

        <div class="export-actions">
            <button class="export-btn" onclick="exportPasscodesExcel()">
                <span>📊 Export Excel (.csv)</span>
            </button>
            <button class="export-btn" onclick="exportPasscodesPDF()">
                <span>📄 Export PDF Report</span>
            </button>
            <button class="export-btn" onclick="printPasscodes()">
                <span>🖨️ Print Passcodes</span>
            </button>
        </div>

        <button class="btn" style="margin-top: 20px;" onclick="window.location.reload()">Done / Purchase More</button>
    </div>
</div>

<script>
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

    let pricingSettings = {
        single_passcode_price_6m: 1400.00,
        small_bulk_price_6m: 1100.00,
        large_bulk_price_6m: 1000.00
    };

    let generatedPasscodesList = [];

    async function loadPricingSettings() {
        try {
            const res = await fetch("/fillop/api/v1/pricing.php");
            const data = await res.json();
            if (data.success && data.pricing) {
                pricingSettings = data.pricing;
            }
        } catch (e) {
            console.error("Failed to fetch live pricing settings:", e);
        }
        updatePricingNotice();
        calculateTotal();
    }

    function updatePricingNotice() {
        const p1 = pricingSettings.single_passcode_price_6m.toLocaleString();
        const p2 = pricingSettings.small_bulk_price_6m.toLocaleString();
        const p3 = pricingSettings.large_bulk_price_6m.toLocaleString();

        document.getElementById("tierNotice").innerHTML = `
            <strong>Pricing Tiers (6 Months Base):</strong><br>
            • Single Passcode (1): <strong>₦${p1}</strong><br>
            • Small Bulk (2 – 9 Passcodes): <strong>₦${p2}</strong> per passcode<br>
            • Large Bulk (10+ Passcodes): <strong>₦${p3}</strong> per passcode<br>
            • 1-Year Subscriptions cost exactly twice (2×) the 6-month fee. Multi-category selection adds an extra fee per category.
        `;
    }

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
    }

    function toggleCategoryCard(cat) {
        const chk = document.getElementById(`chkCat${cat}`);
        const card = document.getElementById(`cardCat${cat}`);
        chk.checked = !chk.checked;
        card.classList.toggle("selected", chk.checked);

        const panel = document.getElementById(`panel${cat}`);
        if (chk.checked) {
            panel.classList.add("active-card");
        } else {
            panel.classList.remove("active-card");
        }

        calculateTotal();
    }

    function getSelectedCategoriesAndSubjects() {
        const cats = [];
        const selections = { JAMB: [], WAEC: [], NECO: [], allIds: [], allNames: [] };

        ["JAMB", "WAEC", "NECO"].forEach(cat => {
            const chk = document.getElementById(`chkCat${cat}`);
            if (chk.checked) {
                cats.push(cat);
                const checked = Array.from(document.querySelectorAll(`input[name="subj_${cat}"]:checked`));
                checked.forEach(cb => {
                    const id = cb.value;
                    const name = cb.getAttribute("data-name");
                    selections[cat].push({ id, name });
                    selections.allIds.push(id);
                    selections.allNames.push(`${cat}: ${name}`);
                });
            }
        });

        return { selectedCategories: cats, selections };
    }

    function calculateTotal() {
        const { selectedCategories, selections } = getSelectedCategoriesAndSubjects();
        const catCount = selectedCategories.length || 1;
        const qty = parseInt(document.getElementById("passcodeQty").value) || 1;
        const durationMonths = parseInt(document.getElementById("subDuration").value) || 6;
        const durMultiplier = (durationMonths === 12) ? 2.0 : 1.0;

        let unitPrice6m = pricingSettings.single_passcode_price_6m;
        if (qty >= 10) {
            unitPrice6m = pricingSettings.large_bulk_price_6m;
        } else if (qty >= 2) {
            unitPrice6m = pricingSettings.small_bulk_price_6m;
        }

        const totalPerPasscode = unitPrice6m * catCount * durMultiplier;
        const grandTotal = totalPerPasscode * qty;

        document.getElementById("sumUnitPrice").innerText = `₦${unitPrice6m.toLocaleString()}`;
        document.getElementById("sumCatCount").innerText = `${catCount} ${catCount === 1 ? 'Category' : 'Categories'}`;
        document.getElementById("sumDurMult").innerText = `${durMultiplier}× (${durationMonths} Months)`;
        document.getElementById("sumQty").innerText = `${qty} ${qty === 1 ? 'Passcode' : 'Passcodes'}`;
        document.getElementById("sumTotal").innerText = `₦${grandTotal.toLocaleString()}`;

        return { catCount, qty, durationMonths, selectedCategories, selections, grandTotal };
    }

    document.getElementById("subscribeForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("candName").value.trim();
        const email = document.getElementById("candEmail").value.trim();
        const phone = document.getElementById("candPhone").value.trim();
        const orgType = document.getElementById("orgType").value;
        const orgName = document.getElementById("orgName").value.trim();

        const { catCount, qty, durationMonths, selectedCategories, selections, grandTotal } = calculateTotal();

        if (selectedCategories.length === 0) {
            alert("Please select at least one examination category (JAMB, WAEC, or NECO).");
            return;
        }

        if (qty > 1 && !orgName) {
            alert("Please provide your Organization / School Name for bulk purchases.");
            return;
        }

        // Validate subject count rules
        if (selectedCategories.includes("JAMB")) {
            const cnt = selections.JAMB.length;
            if (cnt < 4 || cnt > 5) {
                alert("JAMB requires a minimum of 4 subjects and a maximum of 5 subjects.");
                return;
            }
        }
        if (selectedCategories.includes("WAEC")) {
            const cnt = selections.WAEC.length;
            if (cnt < 4 || cnt > 9) {
                alert("WAEC requires a minimum of 4 subjects and a maximum of 9 subjects.");
                return;
            }
        }
        if (selectedCategories.includes("NECO")) {
            const cnt = selections.NECO.length;
            if (cnt < 4 || cnt > 9) {
                alert("NECO requires a minimum of 4 subjects and a maximum of 9 subjects.");
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
                    phone,
                    organization_type: orgType,
                    organization_name: orgName,
                    quantity: qty,
                    exam_category: selectedCategories.join(","),
                    selected_subjects: selections.allIds,
                    max_devices: parseInt(document.getElementById("maxDevices").value) || 1,
                    duration_months: durationMonths
                })
            });
            const data = await res.json();

            if (data.success && data.reference) {
                // Verify payment
                const vRes = await fetch("/fillop/api/v1/payments/verify.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reference: data.reference })
                });
                const vData = await vRes.json();

                if (vData.success) {
                    generatedPasscodesList = vData.passcodes || [vData.passcode];

                    const container = document.getElementById("passcodeListContainer");
                    container.innerHTML = "";
                    generatedPasscodesList.forEach((code, idx) => {
                        const div = document.createElement("div");
                        div.className = "passcode-item";
                        div.innerText = `${idx + 1}. ${code}`;
                        container.appendChild(div);
                    });

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
            btn.innerHTML = '<span>Pay &amp; Generate Passcodes</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
        }
    });

    function exportPasscodesExcel() {
        if (!generatedPasscodesList.length) return;
        let csvContent = "data:text/csv;charset=utf-8,Passcode,Status,Duration\n";
        generatedPasscodesList.forEach(code => {
            csvContent += `${code},Active,${document.getElementById("subDuration").value} Months\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Fillop_CBT_Passcodes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportPasscodesPDF() {
        printPasscodes();
    }

    function printPasscodes() {
        const w = window.open("", "_blank");
        w.document.write(`
            <html>
            <head><title>Fillop CBT Passcode Receipt</title></head>
            <body style="font-family: sans-serif; padding: 30px;">
                <h2>Fillop CBT Guru - Passcode Report</h2>
                <p>Purchaser: ${document.getElementById("candName").value} (${document.getElementById("candEmail").value})</p>
                <p>Organization: ${document.getElementById("orgName").value || "N/A"}</p>
                <hr>
                <h3>Generated Passcodes:</h3>
                <ul>
                    ${generatedPasscodesList.map(c => `<li style="font-size: 18px; font-family: monospace; font-weight: bold;">${c}</li>`).join("")}
                </ul>
            </body>
            </html>
        `);
        w.document.close();
        w.print();
    }

    renderSubjects();
    loadPricingSettings();
</script>
</body>
</html>
