# STH Mini Web CTF 2025 ครั้งที่ 1

![รูปโปรโมทการแข่งขันจากเพจ Siam Thanat Hack Co., Ltd.][promote_picture]

สวัสดีผู้อ่านทุกท่านครับ เนื่องจากผมได้เห็นในเพจ Facebook ของบจก. สยามถนัดแฮก (Siam Thanat Hack Co., Ltd.) ว่ามีการแข่งขัน Mini Web CTF เลยสนใจลองร่วมกิจกรรมดูครับ ผมเพิ่งเคยเขียนบล็อกเป็นครั้งแรก หากมีข้อผิดพลาดประการใดต้องขออภัยด้วยครับ 🙏

โจทย์และเป้าหมายในการแข่งขันมีดังนี้:

> - ทำการโจมตีเว็บโจทย์การแข่งขันเพื่อหาข้อความลับ ที่เรียกว่า Flag โดย Flag จะมีรูปแบบ เช่น STH1{cff940beed74db5e1c7c63007223a6e6}
> - เข้าสู่ระบบเป็นสิทธิ์ผู้ดูแลระบบ (Flag 1)
> - ทำการพิมพ์เงินออกจากระบบ (Flag 2)

โดยเว็บโจทย์การแข่งขันในครั้งนี้คือ https://web1.ctf.p7z.pw

---

## TL;DR
- ดึง credential ที่ถูก comment ไว้ใน HTML source code ของหน้าล็อกอิน ไปล็อกอินเป็น user ธรรมดา
- เรียกใช้ function ที่เจอในหน้าหลักหลังล็อกอิน เพื่อดึงข้อมูล username และ `remember_me_token` ของ admin
- ตอนล็อกอิน user ธรรมดาให้ติ้ก "Remember Me" เพื่อให้ระบบส่งค่า `remember_me` กลับมาใน cookie
- ทำการ crack JWT ใน cookie `remember_me` ของ user ธรรมดา โดยใช้ wordlist `rockyou.txt` เพื่อหา secret key ที่ใช้ในการ sign
- สร้าง JWT ใหม่โดยแทนที่ payload ด้วย `remember_me_token` ของ admin และใช้ secret key ที่ได้จากการ crack ในการ sign
- ใช้ JWT ที่สร้างขึ้นมาเข้าสู่หน้า `index.php` เพื่อให้ระบบเซ็ทค่า `PHPSESSID` จากนั้นเข้าหน้า `admin.php` เพื่อพบ Flag 1 ที่ถูก comment ไว้ใน HTML
- แก้ไขค่าของ parameter `amount` ที่อยู่ใน POST request ตอนพิมพ์เงิน เป็น <number>%0ASTH (เช่น 123%0ASTH) แล้วส่งไป จากนั้นจะได้ Flag 2 มา
- Flag 1: `STH1{310052ba6883872435f7c5aafa850813}`
- Flag 2: `STH2{d9d2532fd8ad5419450b5ea34ed93f32}`

---

## ขั้นตอนการแก้โจทย์

1. เริ่มแรกผมก็เข้าไปที่เว็บไซต์ของโจทย์ แล้วก็พบกับหน้าล็อคอินที่ให้ใส่ "Username" กับ "Password" และมีปุ่ม "Remember Me" ให้กด

ผมได้เซ็ทให้ request ผ่าน Burp Proxy ไว้ด้วย เผื่อว่าจะไปดู HTTP request / response หรือตอนที่เราอยาก repeat request อันไหนก็จะสามารถทำได้โดยง่าย

![หน้าล็อคอินเมื่อเข้ามาใน https://web1.ctf.p7z.pw ครั้งแรก][image_01]

2. ตอนแรกผมก็ยังไม่ fuzz หา directory ครับ เพราะไม่แน่ใจว่าสามารถทำได้หรือเปล่า (กลัวอยู่นอกเหนือ scope แล้วไปทำเว็บล่ม 5555) ผมเลยลองมาดูที่ HTML source code ก่อน เผื่อว่ามี comment ที่มีประโยชน์สำหรับเรา

แล้วก็เจอ credential ที่ถูก comment ไว้

```html
<!-- Credentials: username 'test', password 'test' -->
```

![HTML source code ของหน้าล็อคอิน][image_02]

3. ผมเลยลองเอา credential นั้นมาใช้ล็อคอิน ผลคือล็อคอินสำเร็จ และถูก redirect มาที่หน้า `userinfo.php` พร้อมกับแสดงข้อมูลของ user `test`

![หน้าเว็บเพจ /userinfo.php ของ user `test`][image_03]

4. พอลองมาดูใน HTML source code ของหน้า `userinfo.php` เห็นว่ามีการใช้ JavaScript จากในไฟล์ `script.js`

![HTML source code ของหน้า /userinfo.php][image_04]

ผมเลยลองเข้าไปดูโค้ดในไฟล์จากแถบ "Sources" ของ "Developer Tools" ใน browser แล้วก็เห็นโค้ดตามด้านล่าง

```javascript
// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Fetch the current user's information from the API
  fetch('api.php?action=get_userinfo')
    .then(response => response.json())
    .then(data => {
      if (data.username) {
        // Populate the page with user info
        document.getElementById('username').textContent = data.username;
        document.getElementById('role').textContent = data.role;
        document.getElementById('status').textContent = data.status;
      } else if (data.error) {
        console.error('API Error:', data.error);
      } else {
        console.error('Unexpected response format.');
      }
    })
    .catch(err => {
      console.error('Error fetching user info:', err);
    });
});

function debugFetchUserTest() {
  fetch('api.php?action=get_userinfo&user=test')
    .then(response => response.json())
    .then(data => {
      console.log('Debug get_userinfo for user=test:', data);
    })
    .catch(err => {
      console.error('Error in debugFetchUserTest:', err);
    });
}

function debugFetchAllUsers() {
  // admin.php
  fetch('api.php?action=get_alluser')
    .then(response => response.json())
    .then(data => {
      console.log('Debug get_alluser result:', data);
    })
    .catch(err => {
      console.error('Error in debugFetchAllUsers:', err);
    });
}
```

5. จากที่เห็นใน `script.js` มีการ fetch ข้อมูลจาก `/api.php?action=get_userinfo` ผมก็เลยลองไปดู HTTP request นี้ใน Burp Proxy จะเห็นว่าตัวเว็บ response กลับมาด้วยข้อมูลของ user `test` ได้แก่ `username`, `role`, `remember_me_token`, และ `status`

![HTTP request และ response จาก /api.php?action=get_userinfo][image_05_1]

และเห็นว่าจะมีอีก 2 functions ที่สามารถเรียกใช้ได้ก็คือ:
- `debugFetchUserTest()` - ดึงข้อมูลของ user `test`
- `debugFetchAllUsers()`- ดึงรายชื่อ user ทั้งหมด

ซึ่งเราสามารถ request ไปที่ path ที่ระบุไว้ใน function ตรง ๆ เลยก็ได้ แต่ผมลองเรียกใช้ function ทั้งสองดูก่อนผ่าน "Console" ของ "Developer Tools" แล้วก็ได้ผลลัพธ์ดังรูปด้านล่าง

![ผลลัพธ์ของการเรียกใช้ `debugFetchAllUsers()` และ `debugFetchUserTest()`][image_05_2]

อีกทั้งผมเห็นว่าใน `debugFetchAllUsers()` ระบุหน้า `admin.php` ไว้เป็น comment ผมเลยลองเข้าไปที่หน้านั้นดู แต่ก็โดน redirect กลับมา เลยคิดว่าน่าจะต้องมีสิทธิ์ admin ก่อน

6. จาก function ทั้งสองทำให้ได้ username ที่ดูน่าจะเป็นของ admin มาก็คือ `admin-uat` และเห็นว่าเราสามารถระบุชื่อ `user` ที่เราต้องการจะดึงข้อมูลใน parameter user ของ `/api.php?action=get_userinfo&user=<username>` ได้ ผมเลยลองระบุ username ของ admin และส่งไปที่ระบบ ปรากฏว่าสามารถดึงข้อมูลของ `admin-uat` มาได้

![HTTP request และ response จาก /api.php?action=get_userinfo&user=admin-uat][image_06]

7. ตอนนั้นกำลังหาว่า `remember_me_token` สามารถเอาไปใช้ที่ไหนได้บ้าง และนึกขึ้นได้ว่าหน้าล็อกอินมี "Remember Me" ให้กดอยู่ ผมก็เลยลองไปล็อกอินใหม่และกดให้ "Remember Me" ด้วย จากนั้นเห็นว่าตัวระบบจะเซ็ทค่า `remember_me` มาให้ใน cookie

![HTTP request และ response จากตอนที่ล็อกอินของ user `test` และติ๊ก "Remember Me"][image_07]

8. จากที่เห็นรูปแบบของค่า `remember_me` แล้ว คิดว่าอาจจะเป็น JWT ผมเลยลองไป decode ในเว็บ jwt.io ดู ปรากฏว่าสามารถ decode ได้ และเห็นว่าใน payload มี key ชื่อ `token` อยู่ ซึ่งค่าตรงกับ `remember_me_token` ของ user `test` พอดี

![ผลลัพธ์จากการนำค่า `remember_me` ไป JWT decode][image_08]

9. ทีนี้ผมก็ลองทำ JWT attacks จากที่เคยศึกษามาบ้างใน PortSwigger ผมได้ลองทำสองวิธีคือ:
- เปลี่ยนแค่ค่า `token` ใน JWT payload และปล่อย header กับ signature ไว้คงเดิม เผื่อว่าระบบมีการ verify signature ที่ไม่ดี หรือไม่มีเลย
- เปลี่ยน algorithm `alg` ใน header เป็น `none` หรือ `nOnE` และ payload และลบ signature ออก เผื่อว่าระบบจะยอมรับ JWT ที่ไม่มี signature

ซึ่งเราสามารถส่ง request ไปที่ `/index.php` พร้อมกับระบุค่า `remember_me` ไปใน cookie จากนั้นดู response ของระบบว่าเราสามารถใช้ token นั้นได้หรือไม่ โดยถ้าสามารถใช้ได้ ตัวระบบจะ redirect เราไปที่หน้า `userinfo.php` ของ user นั้น

![HTTP response เมื่อ JWT นั้นสามารถใช้ได้][image_09_1]

แต่ถ้าเราไม่สามารถใช้ token นั้นได้ ระบบจะ response กลับมาด้วยหน้าล็อกอิน

![HTTP repsonse เมื่อ JWT นั้นไม่สามารถใช้ได้][image_09_2]

ผลปรากฏว่าทั้งสองวิธีข้างต้นไม่สามารถใช้ได้ ผมเลยลองวิธีสุดท้ายคือ brute-force หา secret key ที่ใช้ sign เลย

10. ผมลอง brute-force หา JWT secret key ของ user `test` โดยใช้ `hashcat` เซ็ท Attack mode เป็น `-a 0` และ Hash mode เป็น `-m 16500` (JWT) และใช้ wordlist ยอดนิยมคือ `rockyou`

```bash
hashcat -a 0 -m 16500 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbiI6ImI4MTk0M2JhLWQxYzUtNDk1YS04NDI3LTQ3MTFjMzkyNTZiZiJ9.Rlk_a69lx16hNhwn4nBfRxhiMGmEDoPIcxfr1_7JdH8' /usr/share/wordlists/rockyou.txt
```

ปรากฏว่าสามารถ brute-force ได้สำเร็จ! ส่วน secret key ที่ใช้ sign ก็คือ `"bobcats"` (มี " ด้วย ตอนแรกผมไปใช้แค่ bobcats 5555)

![ผลลัพธ์จาก hashcat ว่าเจอ secret key ที่ถูกต้อง][image_10]

11. หลังจากนั้นผมก็สร้าง JWT ขึ้นมา โดยแก้ค่าใน payload เป็น `remember_me_token` ของ `admin-uat` และ sign ด้วย secret key ที่เพิ่ง brute-force ได้มาข้างบน

ในการสร้าง JWT มีหลายวิธี แต่ผมใช้ JSON Web Tokens Extension ใน Burp Suite เพราะเราสามารถแก้ JWT และส่ง request ไปได้เลยครับ

![การสร้าง JWT ด้วย Extension ใน Burp Suite และ HTTP response จากระบบ][image_11_1]

พอใช้ JWT นั้นไปใส่เป็นค่าใน `remember_me` cookie และส่งไปที่ `/index.php` ผลลัพธ์คือตัวระบบ redirect ไปที่ `userinfo.php` แสดงว่า JWT นี้สามารถใช้เข้าสู่ระบบได้ และในหน้า `userinfo.php` แสดงผลว่าเราเป็น `admin-uat` เรียบร้อย

![หน้า /userinfo.php เมื่อเข้าสู่ระบบเป็น `admin-uat` ได้สำเร็จ][image_11_2]

12. พอสามารถเข้าสู่ระบบเป็น admin ได้แล้ว ผมก็ลองเข้าไปที่หน้า `admin.php` ใหม่ (อ้างอิงจากที่เจอใน `script.js`) ระบบก็ส่งหน้าพิมพ์เงินมาให้สำเร็จ

![หน้า /admin.php][image_12_1]

พอมาดูใน HTML source code ของเว็บเพจ ก็จะได้ Flag ที่ 1 มา

![HTML source code ของหน้า /admin.php][image_12_2]

### Flag 1:

```
STH1{310052ba6883872435f7c5aafa850813}
```

13. พอเลื่อนลงมาดูใน HTML source ของหน้า `admin.php` อีก ก็เจอกับโค้ด PHP ที่น่าจะเป็นของฝั่ง backend ถูก comment ไว้

![HTML source code เพิ่มเติมของหน้า /admin.php][image_13_1]

```php
function validateNumber($input) {
    if (preg_match('/^[0-9]+$/m', $input)) {
        return true;
    }
    return false;
}

$amount = $_POST['amount'] ?? '';
[...]

if(validateNumber($amount) && strpos($amount, 'STH') ){
    $outputMessage = "Printing $amount $denom ... Completed!<br>";
    $outputMessage .= "Serial Number: <strong>".$_ENV['FLAG2']."</strong>";

}else{
    $outputMessage = 'We need a number, but not a number';
}
```

พอลองไปพิมพ์เงินในหน้า `admin.php` จริง ๆ ก็พบว่าได้ผลลัพธ์เหมือนกับโค้ด PHP ที่เจอเลย ก็คือ "We need a number, but not a number"

![ผลลัพธ์เมื่อใส่เลขอะไรลงไปก็ได้ แล้วกด "Print"][image_13_2]

14. พอลองมาดูในโค้ด PHP จะเห็นว่ามีการเช็ค input (ค่า `amount` ใน POST request) ด้วยสอง function:
- `validateNumber($amount)` - เช็คค่าที่เราใส่เข้าไปด้วย Regex `/^[0–9]+$/m` ว่าต้องเป็นเลข 0–9, 1 ตัวขึ้นไป
- `strpos($amount, 'STH')` - return ตำแหน่งของคำว่า "STH" ในค่าที่เราส่งไป ถ้าไม่เจอก็ return `false`

ผมที่ไม่เคยศึกษา Regex ไว้เลย (😭) ก็ต้องมาศึกษา Regex เพิ่มว่า pattern ในโค้ดมัน match อะไรบ้าง ก็เลยลองไปดูในเว็บ regexr.com และได้คำอธิบายดังรูป

![คำอธิบาย regex ในโค้ด PHP จากเว็บ regexr.com][image_14_1]

ที่น่าสนใจคือ Multiline flag (`m`) ที่ในโค้ดใช้ส่งผลให้ `^` กับ `$` ที่ปกติแล้วจะ match ตัวเริ่มจนถึงตัวสุดท้ายของทั้ง string กลายเป็น match ของ**แต่ละบรรทัด**แทน

ตัวอย่างเช่น สมมติว่าเราใส่ input เป็น `123<newline>STH`:
- ปกติแล้วถ้าไม่มี `m` มันจะไป match คำของทั้ง string ทำให้ input นี้ไม่ match (เพราะมี newline (\n) กับ STH อยู่)

![ผลลัพธ์เมื่อไม่มี Multiline flag (m)][image_14_2]

- แต่พอมี `m` มันจะไป match คำของแต่ละบรรทัดแทน ทำให้ input นี้ match

![ผลลัพธ์เมื่อมี Multiline flag (m)][image_14_3]

15. ทีนี้เราก็สามารถส่งค่าที่จะผ่านทั้งสอง conditions ได้ก็คือ ตัวเลขใด ๆ ก็ได้ 0–9 อย่างน้อย 1 ตัว + ขึ้นบรรทัดใหม่ + คำว่า "STH"

ซึ่งตัวเลขหรือ "STH" จะขึ้นก่อนก็ได้ แต่ห้ามให้ "STH" อยู่ในตำแหน่งแรก เพราะ strpos() จะ return เป็นค่า 0 (เจอ "STH" ในตำแหน่งแรก) ทำให้ condition ถูกตัดสินว่าเป็น false

ตัวอย่าง input ที่ผมใช้ก็คือ

```
123
STH
```

"123" ในบรรทัดแรกจะทำให้ผ่าน regex และ `validateNumber` return true และ "STH" ใน string จะทำให้ `strpos` return เป็นค่าตำแหน่ง (0, 1, 2, …) ซึ่งถ้าไม่ใช่ 0 ก็จะถูกคิดว่าเป็น true และทำให้เราสามารถผ่านทั้ง condition ได้

16. ต่อมาผมก็ต้องส่งค่านี้ไปที่ระบบ โดยการไปแก้ค่าของ parameter `amount` ใน HTTP POST request ไปที่ `/admin.php` ซึ่งก่อนที่เราจะใส่ค่านี้ลงไปได้ เราต้องทำการ URL-encode มันก่อน เพื่อให้ input เราถูก interpret อย่างถูกต้อง

โดยผมจะใช้เว็บ CyberChef ในการ encode (ในตอนแรกผม encode ด้วยตัวเองโดยการพิมพ์ `\n` เข้าไปตรง ๆ ทำให้มันไป encode ตัวอักษร "\n" แทนที่จะเป็น newline เลยติดอยู่ตรงนี้นานเลยครับ 😭)

![ผลลัพธ์จากการ URL-encode input ที่เราจะส่งไปที่ระบบ][image_16]

สรุปค่าที่ส่งไปที่ระบบก็คือ

```
amount=123%0ASTH&denomination=USD
```

17. พอส่ง POST request พร้อมกับค่า `amount=123%0ASTH` ไป ระบบก็ response กลับมาพร้อมกับ Flag ที่ 2 ถือว่าได้ครบตามที่โจทย์กำหนดเรียบร้อยครับ

![HTTP POST request และ response ตอนที่ส่งค่า amount ที่ถูกดัดแปลงไปที่ /admin.php][image_17_1]

![หน้าเว็บเพจ /admin.php ตอนที่ระบบส่ง Flag ที่ 2 กลับมา][image_17_2]

### Flag 2:

```
STH2{d9d2532fd8ad5419450b5ea34ed93f32}
```

---

## สรุป

ผมก็ได้เรียนรู้อะไรมากมายจากการทำ Mini CTF ครั้งนี้ ไม่ว่าจะเป็น Regex หรือการ URL-encode ที่ถูกต้อง รวมถึงการได้มาเขียน write-up แรกด้วย และผมคิดว่าตัวเองทำช้ามาก คิดว่าต้องพยายามอีกเยอะ ทำโจทย์อีกเยอะ ๆ เลยครับ ทั้งนี้ผมเองก็ยังอ่อนประสบการณ์อยู่มาก ถ้าผู้อ่านท่านใดมีข้อเสนอแนะ อย่างเช่นมีวิธีที่ดีกว่านี้ ผมยินดีที่จะรับไว้มาก ๆ ครับ ขอบคุณครับ

ขอบคุณทางบจก. สยามถนัดแฮกสำหรับกิจกรรมดี ๆ นี้ด้วยครับ 🙏

---

### เว็บไซต์ที่มีประโยชน์ / อ้างอิง

- https://jwt.io/
- https://portswigger.net/web-security/jwt
- https://github.com/PortSwigger/json-web-tokens
- https://regexr.com/
- https://gchq.github.io/CyberChef/

[promote_picture]: images/sth_mini_web_ctf_00000.jpg "รูปโปรโมทการแข่งขันจากเพจ Siam Thanat Hack Co., Ltd."
[image_01]: images/sth_mini_web_ctf_00001.png "หน้าล็อคอินเมื่อเข้ามาใน https://web1.ctf.p7z.pw ครั้งแรก"
[image_02]: images/sth_mini_web_ctf_00002_edited.png "HTML source code ของหน้าล็อคอิน"
[image_03]: images/sth_mini_web_ctf_00003_edited.png "หน้าเว็บเพจ /userinfo.php ของ user `test`"
[image_04]: images/sth_mini_web_ctf_00004_edited.png "HTML source code ของหน้า /userinfo.php"
[image_05_1]: images/sth_mini_web_ctf_00005_edited.png "HTTP request และ response จาก /api.php?action=get_userinfo"
[image_05_2]: images/sth_mini_web_ctf_00006_edited.png "ผลลัพธ์ของการเรียกใช้ `debugFetchAllUsers()` และ `debugFetchUserTest()`"
[image_06]: images/sth_mini_web_ctf_00007_edited.png "HTTP request และ response จาก /api.php?action=get_userinfo&user=admin-uat"
[image_07]: images/sth_mini_web_ctf_00008_edited.png "HTTP request และ response จากตอนที่ล็อกอินของ user `test` และติ๊ก \"Remember Me\""
[image_08]: images/sth_mini_web_ctf_00013_edited.png "ผลลัพธ์จากการนำค่า `remember_me` ไป JWT decode"
[image_09_1]: images/sth_mini_web_ctf_00009_edited.png "HTTP response เมื่อ JWT นั้นสามารถใช้ได้"
[image_09_2]: images/sth_mini_web_ctf_00010_edited.png "HTTP reponse เมื่อ JWT นั้นไม่สามารถใช้ได้"
[image_10]: images/sth_mini_web_ctf_00014_edited.png "ผลลัพธ์จาก hashcat ว่าเจอ secret key ที่ถูกต้อง"
[image_11_1]: images/sth_mini_web_ctf_00015_edited.png "การสร้าง JWT ด้วย Extension ใน Burp Suite และ HTTP response จากระบบ"
[image_11_2]: images/sth_mini_web_ctf_00016_edited.png "หน้า /userinfo.php เมื่อเข้าสู่ระบบเป็น `admin-uat` ได้สำเร็จ"
[image_12_1]: images/sth_mini_web_ctf_00017.png "หน้า /admin.php"
[image_12_2]: images/sth_mini_web_ctf_00020_edited.png "HTML source code ของหน้า /admin.php"
[image_13_1]: images/sth_mini_web_ctf_00021_edited.png "HTML source code เพิ่มเติมของหน้า /admin.php"
[image_13_2]: images/sth_mini_web_ctf_00019.png "ผลลัพธ์เมื่อใส่เลขอะไรลงไปก็ได้ แล้วกด \"Print\""
[image_14_1]: images/sth_mini_web_ctf_00024.png "คำอธิบาย regex ในโค้ด PHP จากเว็บ regexr.com"
[image_14_2]: images/sth_mini_web_ctf_00025.png "ผลลัพธ์เมื่อไม่มี Multiline flag (m)"
[image_14_3]: images/sth_mini_web_ctf_00026.png "ผลลัพธ์เมื่อมี Multiline flag (m)"
[image_16]: images/sth_mini_web_ctf_00027.png "ผลลัพธ์จากการ URL-encode input ที่เราจะส่งไปที่ระบบ"
[image_17_1]: images/sth_mini_web_ctf_00022_edited.png "HTTP POST request และ response ตอนที่ส่งค่า amount ที่ถูกดัดแปลงไปที่ /admin.php"
[image_17_2]: images/sth_mini_web_ctf_00023.png "หน้าเว็บเพจ /admin.php ตอนที่ระบบส่ง Flag ที่ 2 กลับมา"