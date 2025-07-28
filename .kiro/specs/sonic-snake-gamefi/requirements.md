# Sonic Snake GameFi - Gereksinimler Dokümantasyonu

## Giriş

Sonic Network üzerinde çalışan, Slither.io benzeri multiplayer GameFi projesi. Oyuncular Sonic token ile can satın alarak oyuna girer, diğer oyuncuları öldürerek ödül kazanır.

## Gereksinimler

### Gereksinim 1: Temel Oyun Mekaniği

**Kullanıcı Hikayesi:** Bir oyuncu olarak, Slither.io benzeri bir oyun oynayabilmek istiyorum, böylece eğlenceli bir deneyim yaşayabilirim.

#### Kabul Kriterleri

1. WHEN oyuncu oyunu başlattığında THEN yılan karakteri ekranın ortasında spawn olacak
2. WHEN oyuncu mouse'u hareket ettirdiğinde THEN yılan o yöne doğru hareket edecek
3. WHEN oyuncu touch ile hareket ettirdiğinde THEN yılan parmağın olduğu yöne hareket edecek
4. WHEN oyuncu yem yediğinde THEN yılan büyüyecek ve segment eklenecek
5. WHEN oyuncu Space tuşuna bastığında (PC) THEN yılan hızlanacak ama küçülecek
6. WHEN oyuncu ekrana tap yaptığında (Mobil) THEN yılan hızlanacak ama küçülecek
7. WHEN oyun landscape modda açıldığında THEN tam ekran oynanabilecek
6. WHEN oyun 5 dakika sürdüğünde THEN otomatik olarak bitecek

### Gereksinim 2: Ödül Sistemi

**Kullanıcı Hikayesi:** Bir oyuncu olarak, diğer oyuncuları öldürdüğümde ödül kazanmak istiyorum, böylece oyun oynamaya teşvik olayım.

#### Kabul Kriterleri

1. WHEN oyuncu başka bir oyuncuyu öldürdüğünde THEN 0.25 USD değerinde ödül kazanacak
2. WHEN oyuncu 5 kişi öldürüp 5 dakika hayatta kaldığında THEN ekstra 5 USD bonus alacak
3. WHEN oyuncu 5'ten fazla kişi öldürdüğünde THEN her kill için 0.25 USD almaya devam edecek
4. WHEN oyuncu 5 dakika hayatta kalamadığında THEN bonus alamayacak
5. WHEN oyuncu hiç kimseyi öldürmediyse THEN ödül alamayacak

### Gereksinim 3: Can Sistemi

**Kullanıcı Hikayesi:** Bir oyuncu olarak, oyuna girmek için can satın almak istiyorum, böylece oyun ekonomisine katkıda bulunabilirim.

#### Kabul Kriterleri

1. WHEN oyuncu oyuna girdiğinde THEN 1 can harcayacak
2. WHEN oyuncunun canı bittiğinde THEN oyuna giremeyecek
3. WHEN oyuncu can satın aldığında THEN Sonic token ödeyecek
4. WHEN oyuncu maksimum 3 can biriktirdiğinde THEN daha fazla alamayacak
5. WHEN 1 saat geçtiğinde THEN otomatik olarak 1 can yenilenecek

### Gereksinim 4: Çarpışma Sistemi

**Kullanıcı Hikayesi:** Bir oyuncu olarak, diğer oyuncularla çarpıştığımda gerçekçi sonuçlar görmek istiyorum.

#### Kabul Kriterleri

1. WHEN oyuncunun kafası başka yılana çarptığında THEN ölecek
2. WHEN oyuncu öldüğünde THEN parçalara ayrılacak ve yem haline gelecek
3. WHEN oyuncu başka oyuncunun vücuduna çarptığında THEN hiçbir şey olmayacak
4. WHEN oyuncu kendi vücuduna çarptığında THEN ölmeyecek
5. WHEN oyuncu harita sınırına çarptığında THEN karşı taraftan çıkacak

### Gereksinim 5: Web3 Entegrasyonu

**Kullanıcı Hikayesi:** Bir oyuncu olarak, cüzdanımı bağlayarak blockchain üzerinde işlem yapmak istiyorum.

#### Kabul Kriterleri

1. WHEN oyuncu cüzdan bağla butonuna tıkladığında THEN MetaMask açılacak
2. WHEN cüzdan bağlandığında THEN Sonic Network'e otomatik geçecek
3. WHEN oyuncu can satın aldığında THEN blockchain işlemi gerçekleşecek
4. WHEN oyun bittiğinde THEN ödül blockchain'e kaydedilecek
5. WHEN oyuncu ödül çektiğinde THEN cüzdanına Sonic token gelecek

### Gereksinim 6: Multiplayer Sistemi

**Kullanıcı Hikayesi:** Bir oyuncu olarak, diğer oyuncularla aynı anda oynamak istiyorum.

#### Kabul Kriterleri

1. WHEN oyuncu oyuna girdiğinde THEN diğer oyuncuları görecek
2. WHEN başka oyuncu hareket ettiğinde THEN gerçek zamanlı güncellenecek
3. WHEN oyuncu başka oyuncuyu öldürdüğünde THEN tüm oyuncular görecek
4. WHEN bağlantı koptuğunda THEN otomatik yeniden bağlanacak
5. WHEN oyuncu sayısı 30'u geçtiğinde THEN yeni oda açılacak

### Gereksinim 7: NFT Sistemi

**Kullanıcı Hikayesi:** Bir NFT sahibi olarak, oyunda avantajlarım olmasını istiyorum.

#### Kabul Kriterleri

1. WHEN NFT sahibi oyuna girdiğinde THEN bedava can kullanacak
2. WHEN NFT sahibi ödül kazandığında THEN %10 bonus alacak
3. WHEN oyuncular can satın aldığında THEN NFT sahipleri %5 pay alacak
4. WHEN NFT satıldığında THEN %10'u ödül havuzuna gidecek
5. WHEN NFT sahibi 5 dakika + 5 kill yaptığında THEN ekstra 5 USD alacak

### Gereksinim 8: Güvenlik Sistemi

**Kullanıcı Hikayesi:** Bir oyuncu olarak, oyunun adil ve güvenli olmasını istiyorum.

#### Kabul Kriterleri

1. WHEN oyuncu hile yapmaya çalıştığında THEN tespit edilip engellenecek
2. WHEN skor manipüle edilmeye çalışıldığında THEN geçersiz sayılacak
3. WHEN smart contract saldırıya uğradığında THEN durdurulabilecek
4. WHEN oyuncu spam yaptığında THEN rate limit devreye girecek
5. WHEN şüpheli aktivite tespit edildiğinde THEN otomatik uyarı verilecek

### Gereksinim 9: Performans ve Optimizasyon

**Kullanıcı Hikayesi:** Bir oyuncu olarak, oyunun akıcı çalışmasını istiyorum.

#### Kabul Kriterleri

1. WHEN oyun yüklendiğinde THEN 3 saniye içinde başlayacak
2. WHEN 30 oyuncu aynı anda oynadığında THEN 60 FPS korunacak
3. WHEN blockchain işlemi yapıldığında THEN 5 saniye içinde onaylanacak
4. WHEN mobil cihazda oynadığında THEN pil tüketimi optimize olacak
5. WHEN internet yavaş olduğunda THEN oyun oynanabilir kalacak

### Gereksinim 10: Test ve Kalite Güvencesi

**Kullanıcı Hikayesi:** Bir geliştirici olarak, oyunun hatasız çalıştığından emin olmak istiyorum.

#### Kabul Kriterleri

1. WHEN kod değişikliği yapıldığında THEN otomatik testler çalışacak
2. WHEN smart contract deploy edildiğinde THEN güvenlik audit'i geçecek
3. WHEN yeni özellik eklendiğinde THEN integration testleri geçecek
4. WHEN performans testi yapıldığında THEN belirlenen metrikleri karşılayacak
5. WHEN kullanıcı testi yapıldığında THEN %95 memnuniyet alacak