import '../src/hlvm-stdlib.ts';

// Wait for modules to load
await new Promise(r => setTimeout(r, 500));

// Test each module
async function testModules() {
    const tests = [
        { name: "platform", test: () => typeof hlvm?.platform === 'object' && hlvm.platform.info },
        { name: "system", test: () => typeof hlvm?.system === 'object' && hlvm.system.info },
        { name: "app", test: () => typeof hlvm?.app === 'object' && hlvm.app.launch },
        { name: "clipboard", test: () => typeof hlvm?.clipboard === 'object' && hlvm.clipboard.read },
        { name: "fs", test: () => typeof hlvm?.fs === 'object' && hlvm.fs.read },
        { name: "keyboard", test: () => typeof hlvm?.keyboard === 'object' && hlvm.keyboard.type },
        { name: "mouse", test: () => typeof hlvm?.mouse === 'object' && hlvm.mouse.move },
        { name: "notification", test: () => typeof hlvm?.notification === 'object' && hlvm.notification.send },
        { name: "screen", test: () => typeof hlvm?.screen === 'object' && hlvm.screen.capture },
    ];

    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        try {
            if (t.test()) {
                console.log(`✓ ${t.name}`);
                passed++;
            } else {
                console.log(`✗ ${t.name}`);
                failed++;
            }
        } catch (e) {
            console.log(`✗ ${t.name}: ${e.message}`);
            failed++;
        }
    }

    // Test actual functionality
    try {
        const info = hlvm.platform.info();
        console.log(`✓ platform.info() works: ${info.os}`);
        passed++;
    } catch (e) {
        console.log(`✗ platform.info() failed: ${e.message}`);
        failed++;
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
}

await testModules();