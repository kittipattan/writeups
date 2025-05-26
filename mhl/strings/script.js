Java.perform(function() {
	console.log('\n');

	const Activity2Class = Java.use('com.mobilehackinglab.challenge.Activity2');
	Activity2Class.getflag.implementation = function () {
		console.log('[+] getflag is called');
		let returnVal = this.getflag();
		console.log('	flag: ' + returnVal);
		return returnVal;
	}

	// setTimeout to delay for the MainActivity to be fully instantiated
	setTimeout(function () {
		Java.choose('com.mobilehackinglab.challenge.MainActivity', {
			onMatch(instance) {
				console.log('[+] Found MainActivity instance: ' + instance);
				instance.KLOW();

				let prefs = instance.getSharedPreferences('DAD4', 0);
				if (prefs) {
					console.log("	DAD4.UUU0133: " + prefs.getString('UUU0133', null));
				} else {
					console.log("	DAD4 SharedPreferences not found");
					return;
				}

				// launch Activity2 with intent
				let Intent = Java.use('android.content.Intent');
				let intent = Intent.$new();
				let className = "com.mobilehackinglab.challenge.Activity2"
				let Uri = Java.use('android.net.Uri');
				let uri = Uri.parse('mhl://labs/bWhsX3NlY3JldF8xMzM3');

				intent.setAction('android.intent.action.VIEW');
				intent.setClassName(
					className.substring(0, className.lastIndexOf(".")),
					className
				)
				
				intent.setData(uri);
				intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK.value);
				instance.startActivity(intent);

				return 'stop';
			},
			onComplete() {
				console.log('	Enumerate MainActivity instance complete.');
			}
		});

		// setTimeout to delay for the getflag to get called
		setTimeout(function() {
			// Scan the memory to find the flag
			let libflag = Process.findModuleByName('libflag.so');

			if (libflag == null) {
				console.log("[-] Module libflag.so not found");
				return;
			}

			let pattern = "4D 48 4C 7B" // MHL{
			console.log("[+] Start memory scanning");
			Memory.scan(libflag.base, libflag.size, pattern, {
				onMatch(address, size) {
					console.log("	hexdump at address " + address);
					console.log(hexdump(address, { 
						length: 100,
						ansi: true 
					}));
				},
				onComplete() {
					console.log("	Memory scan complete");
				},
				onError(reason) {
					console.log("	Memory scan error: " + reason);
				}
			});

		}, 500);

	}, 3000);
});
