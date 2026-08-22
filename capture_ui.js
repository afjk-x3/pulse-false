const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  
  // Go to manager page
  await page.goto('http://127.0.0.1:3000/manager', { waitUntil: 'networkidle2' });
  
  // Take screenshot of the initial state
  await page.screenshot({ path: 'screenshot_initial.png' });
  
  // Try to click on a meeting to open the modal
  try {
    // Wait for the meeting cards to appear
    await page.waitForSelector('.glass-card', { timeout: 30000 });
    
    // Find the meeting title "Q3 Roadmap Planning" or similar, or just any card with 'cursor-pointer'
    const cards = await page.$$('.cursor-pointer');
    if (cards.length > 0) {
      await cards[0].click();
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for modal animation
      
      // Take screenshot of the modal in view mode
      await page.screenshot({ path: 'screenshot_modal_view.png' });
      
      // Click Edit if available
      const editButtons = await page.$x("//button[contains(., 'Edit')]");
      if (editButtons.length > 0) {
        await editButtons[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Take screenshot of the modal in edit mode
        await page.screenshot({ path: 'screenshot_modal_edit.png' });
      } else {
        console.log("No edit button found (probably not organizer).");
      }
    } else {
      console.log("No meeting cards found to click.");
    }
  } catch (err) {
    console.error("Error during interaction:", err);
  }

  await browser.close();
})();
