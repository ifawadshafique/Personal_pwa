(function () {
  "use strict";

  let myChart = null;

  window.addEventListener("analyticsOpened", async () => {
    try {
      const allExpenses = await dbGetAllExpenses();
      const plan = await dbGetPlan();

      const categoryTotals = {};
      allExpenses.forEach(exp => {
        const cat = plan.categories.find(c => c.id === exp.categoryId);
        const catName = cat ? cat.name : "Uncategorized";
        categoryTotals[catName] = (categoryTotals[catName] || 0) + exp.amount;
      });

      renderChart(categoryTotals);
    } catch (e) {
      console.error("Error charting expenses:", e);
    }
  });

  // Cycle bounds helper
  function getCycleSpan(dateObj) {
    let year = dateObj.getFullYear();
    let month = dateObj.getMonth();
    let day = dateObj.getDate();

    let startYear = year;
    let startMonth = month;
    if (day < 20) {
      if (startMonth === 0) {
         startMonth = 11;
         startYear--;
      } else {
         startMonth--;
      }
    }
    
    let endYear = startYear;
    let endMonth = startMonth + 1;
    if (endMonth > 11) {
        endMonth = 0;
        endYear++;
    }

    const startDate = new Date(startYear, startMonth, 20);
    const endDate = new Date(endYear, endMonth, 19);
    
    return { startDate, endDate };
  }

  document.getElementById("btn-export-csv").addEventListener("click", async () => {
    try {
      const allExpenses = await dbGetAllExpenses();
      const plan = await dbGetPlan();

      let minDate = new Date();
      let maxDate = new Date();

      if (allExpenses.length > 0) {
        const dates = allExpenses.map(e => new Date(e.date + "T00:00:00").getTime());
        minDate = new Date(Math.min(...dates));
        maxDate = new Date(Math.max(...dates));
      }

      // Adjust to local timezone to prevent UTC date shifting
      // Since e.date is string YYYY-MM-DD, new Date(e.date + "T00:00:00") is better,
      // but using simple string comparison avoids timezone math issues if we are careful.
      // Easiest is to ensure minDate and maxDate represent local midnights.
      
      const overallStart = getCycleSpan(minDate).startDate;
      const overallEnd = getCycleSpan(maxDate).endDate;

      let currentDate = new Date(overallStart);
      const csvData = [];

      while(currentDate <= overallEnd) {
          // Format as YYYY-MM-DD based on local month/day
          const y = currentDate.getFullYear();
          const m = String(currentDate.getMonth() + 1).padStart(2, '0');
          const d = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;

          const day = currentDate.getDate();

          const dayExpenses = allExpenses.filter(e => e.date === dateStr);
          
          let comm = day === 20 ? plan.committee : "";
          let ln = day === 20 ? plan.loan : "";

          if (dayExpenses.length === 0) {
              csvData.push({
                  Date: dateStr,
                  Category: "",
                  Amount: "",
                  Note: "",
                  Committee: comm,
                  Loan: ln
              });
          } else {
              dayExpenses.forEach((exp, idx) => {
                  const cat = plan.categories.find(c => c.id === exp.categoryId);
                  csvData.push({
                      Date: dateStr,
                      Category: cat ? cat.name : "Uncategorized",
                      Amount: exp.amount,
                      Note: exp.note || "",
                      Committee: idx === 0 ? comm : "",
                      Loan: idx === 0 ? ln : ""
                  });
              });
          }

          currentDate.setDate(currentDate.getDate() + 1);
      }

      if (csvData.length === 0) {
        alert("No cycle generated.");
        return;
      }

      // Convert to CSV string using PapaParse
      const csvString = Papa.unparse(csvData);

      // Create a Blob and trigger download
      // Prefixing with BOM for Excel UTF-8 compatibility
      const blob = new Blob(["\\ufeff" + csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "meri-budget-expenses.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e) {
      alert("Error generating CSV: " + e.message);
    }
  });

  function renderChart(categoryTotals) {
    const ctx = document.getElementById('expenses-chart').getContext('2d');
    
    // Destroy previous chart if exists
    if (myChart) {
      myChart.destroy();
    }

    const labels = Object.keys(categoryTotals);
    const dataVals = Object.values(categoryTotals);
    
    if (labels.length === 0) {
        labels.push("No Expenses Yet");
        dataVals.push(1);
        Chart.defaults.color = '#8ea1a3';
        myChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: dataVals,
              backgroundColor: ['#1B3735'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { enabled: false }, legend: { position: 'bottom', labels: { color: '#fff' } } }
          }
        });
        return;
    }

    // Generate pleasing colors using HSL
    const backgroundColors = labels.map((_, i) => `hsl(${(i * 360 / labels.length) % 360}, 65%, 60%)`);

    Chart.defaults.color = '#8ea1a3'; // Match theme color style

    myChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Expenses',
          data: dataVals,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderColor: '#0F2426' // background color for gap
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
                color: '#fff'
            }
          }
        }
      }
    });
  }
})();
