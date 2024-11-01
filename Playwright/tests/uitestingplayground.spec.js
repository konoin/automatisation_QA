import { test, expect } from '@playwright/test';

const resource1 = process.env.resource1 || "http://uitestingplayground.com/";
const resource2 = process.env.resource2 || "https://demoqa.com";

test.describe("The Internet Uitestingplayground tests", () => {

    test("Press dynamic ID button", async ({ page }) => {
        await page.goto(`${resource1}/dynamicid`);

        const button = page.locator('button:has-text("Button with Dynamic ID")');
        const buttonId = await button.getAttribute(`id`);

        console.log("Button ID: ", buttonId);
        
        await expect(button).toBeVisible();
        await button.click();

        console.log("Button was tapped");
    });

    test("Calculate delay time for client-side action", async ({ page }) => {
        await page.goto(`${resource1}/clientdelay`);

        const delayButton = page.locator('button:has-text("Button Triggering Client Side Logic")');
        const loadingIndicator = page.locator('#loadingIndicator');
        const dataMessage = page.locator('text=Data calculated on the client side.');

        const startTime = Date.now();
        await delayButton.click();

        await loadingIndicator.waitFor({ state: 'hidden' });
        await dataMessage.waitFor({ state: 'visible' });

        const endTime = Date.now();
        const delayDuration = (endTime - startTime) / 1000;

        console.log("Delay duration: ", delayDuration);

        await expect(dataMessage).toBeVisible();
    });

    test("Progress Bar get information", async ({ page }) => {
        await page.goto(`${resource1}/progressbar`);

        const startButton = page.locator('#startButton');
        const stopButton = page.locator('#stopButton');
        const progressBar = page.locator('#progressBar');
        const result = page.locator('#result');
        
        const resultText = result.textContent();

        console.log(resultText);

        await startButton.click();
        await page.waitForTimeout(2000);
        await stopButton.click();

        await page.reload();

        await startButton.click();


        await page.evaluate(async () => {
            do {
                await new Promise(resolve => setTimeout(resolve, 100)); 
            } while (progressBar.getAttribute('aria-valuenow') !== '75');
        });

        // await page.waitForFunction(() => {
        //     return progressBar.getAttribute('aria-valuenow') === '75';
        // });

        await stopButton.click()
        const arialValueNow = await progressBar.getAttribute('aria-valuenow');
        expect(arialValueNow).toBe("75");
    });

    test("Shadow DOM GUID Generator", async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await page.goto("shadowdom");
    

        const generateButton = page.locator('#buttonGenerate');
        const copyButton = page.locator('#buttonCopy');
        // const keyField = page.locator('#editField');

        await generateButton.click();

        await page.waitForTimeout(1000);

        await copyButton.click();

        const clipboardValue = await page.evaluate(async () => {
            return await navigator.clipboard.readText();
        });
        
        const keyField = page.locator('#editField').shadowRoot();
        const inputValue = await keyField.textContent();

        expect(clipboardValue).toBe(inputValue);
    });
});

test.describe("Resource 2 https://demoqa.com/", () => {

    test("Droppable test", async ({ page }) => {
        await page.goto(`https://demoqa.com/droppable`);

        const navLinks = page.locator('nav.nav-tabs a');

        for (let i = 0; i < await navLinks.count(); i++) {
                await navLinks.nth(i).click();
                await page.bringToFront();

                    if (i === 0) {
                        await simpleDragAndDrop(page, '#droppableExample-tabpane-simple #draggable', '#droppableExample-tabpane-simple #droppable');
                    } else if (i === 1) {
                        await acceptDragAndDrop(page, '#droppableExample-tabpane-accept #acceptable', '#droppableExample-tabpane-accept #notAcceptable', '#droppableExample-tabpane-accept #droppable');
                    } else if (i === 2) {
                        await preventPropogation( 
                            {   page: page, 
                                dragBox: '#droppableExample-tabpane-preventPropogation #dragBox', 
                                firstOuterDroppable: '#droppableExample-tabpane-preventPropogation #notGreedyDropBox',
                                firstInnerDroppable: '#droppableExample-tabpane-preventPropogation #notGreedyDropBox #notGreedyInnerDropBox',
                                secondOuterDroppable: '#droppableExample-tabpane-preventPropogation #greedyDropBox',
                                secondInnerDroppable: '#droppableExample-tabpane-preventPropogation #greedyDropBox #greedyDropBoxInner'
                            });
                    } else if (i === 3) {
                        await revertDraggable({ 
                            page: page,
                            revertDragArea: '#droppableExample-tabpane-revertable #revertable',
                            notRevertDragArea: '#droppableExample-tabpane-revertable #notRevertable',
                            dropArea: '#droppableExample-tabpane-revertable #droppable'
                        });
                }
        }

    });

    async function simpleDragAndDrop(page, dragSelector, dropSelector) {
        const dragMeArea = page.locator(dragSelector);
        const dropArea = page.locator(dropSelector);
    
        await dragMeArea.dragTo(dropArea);
        await expect(dropArea).toContainText('Dropped!');
        console.log('Simple tab is completed');
    }

    async function acceptDragAndDrop(page, dragAcceptableSelector, dragNotAcceptableSelector, dropSelector) {
        const dragAcceptable = page.locator(dragAcceptableSelector);
        const dragNotAcceptable = page.locator(dragNotAcceptableSelector);
        const dropArea = page.locator(dropSelector);
    
        const acceptableBox = await dragAcceptable.boundingBox();
        const notAcceptableBox = await dragNotAcceptable.boundingBox();
        
        await drag(page, notAcceptableBox, dropArea, 'notAcceptable');
        await drag(page, acceptableBox, dropArea, 'acceptable');
    };

    async function drag(page, draggingBox, dropArea, draggingBoxType) {
        const dropBox = await dropArea.boundingBox();

        await page.mouse.move(draggingBox.x + draggingBox.width / 2, draggingBox.y + draggingBox.height / 2);
        await page.mouse.down();
    
        if (dropBox) {
            await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2);
        }
        
        await page.mouse.up();
    
        if (draggingBoxType === 'acceptable') {
            await expect(dropArea).toContainText('Dropped!');
            console.log('Acceptable dragging');
        } else {
            await expect(dropArea).toContainText('Drop here');
            console.log('Not acceptable dragging');
        }
    }

    async function preventPropogation({ page, dragBox, firstOuterDroppable, firstInnerDroppable, secondOuterDroppable, secondInnerDroppable }) {
        const dragElement = page.locator(dragBox);
        const firstOuter = page.locator(firstOuterDroppable);
        const firstInner = page.locator(firstInnerDroppable);
        const secondOuter = page.locator(secondOuterDroppable);
        const secondInner = page.locator(secondInnerDroppable);

        const dragElementBox = await dragElement.boundingBox();
        const firstOuterBox = await firstOuter.boundingBox();
        const firstInnerBox = await firstInner.boundingBox();
        const secondOuterBox = await secondOuter.boundingBox();
        const secondInnerBox = await secondInner.boundingBox();

        await page.mouse.move(dragElementBox.x + dragElementBox.width / 2, dragElementBox.y + dragElementBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(secondInnerBox.x + secondInnerBox.width / 2, secondInnerBox.y + secondInnerBox.height / 2);
        await page.mouse.up();

        // await expect(secondInner).toContainText('Dropped!');
        // await expect(secondOuter).toContainText('Outer droppable');

        await page.mouse.move(dragElementBox.x + dragElementBox.width / 2, dragElementBox.y + dragElementBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(secondOuterBox.x + secondOuterBox.width / 2, secondOuterBox.y + 10);
        await page.mouse.up();

        await expect(secondInner).toContainText('Dropped!');
        await expect(secondOuter).toContainText('Dropped!');

        await dragElement.dragTo(firstInner);

        await expect(firstOuter).toContainText('Dropped!');
        await expect(firstInner).toContainText('Dropped!');
    }

    async function revertDraggable( { page, revertDragArea, notRevertDragArea, dropArea} ) {
        const revertDrag = page.locator(revertDragArea);
        const notRevertDrag = page.locator(notRevertDragArea);
        const drop = page.locator(dropArea);

        const revertDragBox = await revertDrag.boundingBox();
        const notRevertDragBox = await notRevertDrag.boundingBox();
        const dropBox = await drop.boundingBox();
        
        const { x: firstRevertX, y: firstRevertY } = revertDragBox;

        await page.mouse.move(revertDragBox.x + revertDragBox.width / 2, revertDragBox.y + revertDragBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(dropBox.x + dropBox.width /2, dropBox.y + dropBox.height /2);
        await page.mouse.up();

        await page.waitForTimeout(2000);

        const { x: secondRevertX, y: secondRevertY } = revertDragBox;

        await expect(firstRevertX).toBe(secondRevertX);
        await expect(firstRevertY).toBe(secondRevertY);

        const { x: firstNotRevertX, y: firstNotRevertY } = notRevertDragBox;

        await notRevertDrag.dragTo(drop);
        await page.waitForTimeout(1000);

        const { x: secondNotRevertX, y: secondNotRevertY } = notRevertDragBox;

        await page.mouse.move(notRevertDragBox.x + notRevertDragBox.width / 2, notRevertDragBox.y + notRevertDragBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(firstNotRevertX, firstNotRevertY);
        await page.mouse.up();

        await page.waitForTimeout(1000);

        const { x: thirdNotRevertX, y: thirdNotRevertY } = notRevertDragBox;

        await expect(secondNotRevertX).toBe(thirdNotRevertX);
        await expect(secondNotRevertY).toBe(thirdNotRevertY);

    }

});