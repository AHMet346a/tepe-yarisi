// mapsettings.js — KOMPAKT lazy-üretim (100 ortak + 36 map×500 + env 1000 = 19100 ayar) [ÜRETİLDİ]
(function(){
  var COMMON=[{"i":"gravity","c":"Fizik","l":"Yerçekimi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"drive_power","c":"Fizik","l":"Motor Gücü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"brake_power","c":"Fizik","l":"Fren Gücü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"wheelie_torque","c":"Fizik","l":"Ön Kaldırma (Wheelie)","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"air_control","c":"Fizik","l":"Hava Kontrolü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"susp_stiff","c":"Fizik","l":"Süspansiyon Sertliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"susp_damp","c":"Fizik","l":"Süspansiyon Sönümü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"mass","c":"Fizik","l":"Araç Ağırlığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"grip","c":"Fizik","l":"Tekerlek Tutuşu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"max_speed","c":"Fizik","l":"Maksimum Hız","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"boost_power","c":"Fizik","l":"Nitro Gücü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"boost_dur","c":"Fizik","l":"Nitro Süresi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"air_downforce","c":"Fizik","l":"Hava Basıncı (aşağı çekim)","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"ground_snap","c":"Fizik","l":"Yere Yapışma","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"flip_bonus","c":"Fizik","l":"Takla Bonusu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"head_death","c":"Fizik","l":"Kafa Değince Ölüm","t":"t","d":1},{"i":"roll_resist","c":"Fizik","l":"Yuvarlanma Direnci","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"traction_ctrl","c":"Fizik","l":"Çekiş Kontrolü","t":"t","d":0},{"i":"landing_soft","c":"Fizik","l":"İniş Yumuşaklığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"momentum","c":"Fizik","l":"Momentum Korunumu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"reverse_power","c":"Fizik","l":"Geri Vites Gücü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"auto_balance","c":"Fizik","l":"Otomatik Denge","t":"t","d":0},{"i":"hill_height","c":"Arazi","l":"Tepe Yüksekliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"hill_width","c":"Arazi","l":"Tepe Genişliği","t":"s","mn":1,"mx":10000,"d":150,"u":"%","st":5},{"i":"bumpiness","c":"Arazi","l":"Engebe","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"roughness","c":"Arazi","l":"Pürüzlülük","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"dip_depth","c":"Arazi","l":"Çukur Derinliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"ramp_freq","c":"Arazi","l":"Rampa Sıklığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"flat_start","c":"Arazi","l":"Düz Başlangıç","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"terrain_detail","c":"Arazi","l":"Arazi Detayı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"cliff_chance","c":"Arazi","l":"Uçurum Olasılığı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"plateau_freq","c":"Arazi","l":"Plato Sıklığı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"valley_depth","c":"Arazi","l":"Vadi Derinliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"crest_sharp","c":"Arazi","l":"Tepe Keskinliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"ground_tex","c":"Arazi","l":"Zemin Dokusu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"edge_walls","c":"Arazi","l":"Kenar Duvarları","t":"t","d":0},{"i":"soft_should","c":"Arazi","l":"Yumuşak Omuzlar","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"micro_bumps","c":"Arazi","l":"Mikro Tümsekler","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"slope_bias","c":"Arazi","l":"Eğim Eğilimi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"noise_oct","c":"Arazi","l":"Gürültü Katmanı","t":"s","mn":1,"mx":10000,"d":3,"u":"x","st":1},{"i":"seed_var","c":"Arazi","l":"Tohum Çeşitliliği","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"grip_var","c":"Arazi","l":"Yüzey Tutuş Değişimi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"coin_freq","c":"Ekonomi","l":"Altın Sıklığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"coin_value","c":"Ekonomi","l":"Altın Değeri","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"fuel_freq","c":"Ekonomi","l":"Yakıt Sıklığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"fuel_amount","c":"Ekonomi","l":"Yakıt Miktarı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"scrap_freq","c":"Ekonomi","l":"Hurda Sıklığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"gem_chance","c":"Ekonomi","l":"Elmas Şansı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"chest_luck","c":"Ekonomi","l":"Sandık Şansı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"coin_magnet","c":"Ekonomi","l":"Altın Mıknatısı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"double_zones","c":"Ekonomi","l":"2x Altın Bölgeleri","t":"t","d":0},{"i":"reward_mult","c":"Ekonomi","l":"Ödül Çarpanı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"combo_reward","c":"Ekonomi","l":"Kombo Ödülü","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"milestone_bonus","c":"Ekonomi","l":"Kilometre Bonusu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"obstacle_dens","c":"Tehlike","l":"Engel Yoğunluğu","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"rock_freq","c":"Tehlike","l":"Kaya Sıklığı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"saw_freq","c":"Tehlike","l":"Testere Sıklığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"spike_freq","c":"Tehlike","l":"Çivi Sıklığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"pit_freq","c":"Tehlike","l":"Çukur Tuzağı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"boulder_freq","c":"Tehlike","l":"Kaya Yuvarlanması","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"moving_hazard","c":"Tehlike","l":"Hareketli Tehlike","t":"t","d":0},{"i":"hazard_dmg","c":"Tehlike","l":"Tehlike Hasarı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"trap_freq","c":"Tehlike","l":"Tuzak Sıklığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"falling_debris","c":"Tehlike","l":"Düşen Enkaz","t":"t","d":0},{"i":"hazard_glow","c":"Tehlike","l":"Tehlike Parıltısı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"safe_zones","c":"Tehlike","l":"Güvenli Bölgeler","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"weather_int","c":"Hava","l":"Hava Şiddeti","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"rain_chance","c":"Hava","l":"Yağmur Olasılığı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"snow_chance","c":"Hava","l":"Kar Olasılığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"fog_density","c":"Hava","l":"Sis Yoğunluğu","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"wind_str","c":"Hava","l":"Rüzgar Gücü","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"lightning","c":"Hava","l":"Şimşek","t":"t","d":0},{"i":"daynight_speed","c":"Hava","l":"Gece/Gündüz Hızı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"start_time","c":"Hava","l":"Başlangıç Saati","t":"s","mn":1,"mx":10000,"d":120,"u":"s","st":10},{"i":"night_dark","c":"Hava","l":"Gece Karanlığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"puddle_slip","c":"Hava","l":"Su Kayganlığı","t":"s","mn":1,"mx":10000,"d":50,"u":"%","st":5},{"i":"ice_slip","c":"Hava","l":"Buz Kayganlığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"heat_haze","c":"Hava","l":"Sıcak Titreşimi","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"cam_zoom","c":"Görsel","l":"Kamera Yakınlığı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"cam_follow","c":"Görsel","l":"Kamera Takibi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"screen_shake","c":"Görsel","l":"Ekran Sarsıntısı","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"particle_dens","c":"Görsel","l":"Parçacık Yoğunluğu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"trail_len","c":"Görsel","l":"İz Uzunluğu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"motion_blur","c":"Görsel","l":"Hareket Bulanıklığı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"color_grade","c":"Görsel","l":"Renk Tonlaması","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"god_rays","c":"Görsel","l":"Işık Huzmeleri","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"vignette","c":"Görsel","l":"Vinyet","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"fov_speed","c":"Görsel","l":"Hız FOV Etkisi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"hud_scale","c":"Görsel","l":"HUD Boyutu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"ambient_motes","c":"Görsel","l":"Ortam Zerreleri","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"slowmo_tricks","c":"Oynanış","l":"Takla Ağır Çekim","t":"t","d":0},{"i":"combo_window","c":"Oynanış","l":"Kombo Süresi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"magnet_radius","c":"Oynanış","l":"Mıknatıs Yarıçapı","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"nitro_regen","c":"Oynanış","l":"Nitro Dolumu","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"fuel_burn","c":"Oynanış","l":"Yakıt Tüketimi","t":"s","mn":1,"mx":10000,"d":100,"u":"%","st":5},{"i":"respawn","c":"Oynanış","l":"Yeniden Doğma","t":"t","d":0},{"i":"checkpoint_freq","c":"Oynanış","l":"Kontrol Noktası","t":"s","mn":1,"mx":10000,"d":1,"u":"%","st":5},{"i":"ghost_racer","c":"Oynanış","l":"Hayalet Rakip","t":"t","d":0},{"i":"mirror_mode","c":"Oynanış","l":"Ayna Modu","t":"t","d":0},{"i":"low_grav_jump","c":"Oynanış","l":"Düşük Yerçekimi Zıplama","t":"t","d":0}];
  var ASP=[["Yükseklik",100],["Yoğunluk",80],["Genişlik",100],["Sıklık",80],["Boyut",100],["Hız Etkisi",100],["Tutuş",100],["Sürüklenme",50],["Sıçratma",60],["Ödül",60],["Tehlike",40],["Parıltı",100],["Titreşim",60],["Dalgalanma",70],["Sertlik",100],["Yumuşaklık",100],["Renk Tonu",100],["Gölge",100],["Yansıma",80],["Derinlik",90],["Rüzgar Etkisi",50],["Sesi",100],["Işık",100],["Buğu",40],["Kayganlık",40],["Yapışkanlık",60],["Esneklik",80],["Ağırlık",100],["Momentum",100],["Zıplama",80],["Savrulma",60],["İvme",100],["Fren Etkisi",100],["Nitro Bonusu",60],["Kombo Süresi",80],["Puan Katı",60],["Altın Şansı",60],["Yakıt Etkisi",100],["Hasar",40],["İyileşme",40],["Görüş Alanı",100],["Kamera Kayması",80],["Sarsıntı",80],["Bulanıklık",20],["Parçacık",100],["İz Uzunluğu",80],["Sis Etkisi",30],["Gölgelenme",90],["Yayılım",70],["Kıvılcım",60],["Yansıtma",70],["Doku Detayı",100],["Katman Sayısı",3],["Varyasyon",100],["Akış Hızı",80],["Direnç",80]];            // [etiket, varsayilan]
  var TOG=["Efekt Açık","Bonus Modu","Ekstra Katman","Parlama","Ters Etki","Süper Mod","Gizli Bonus","Kaos Modu"];
  var KEYS={"countryside":["Çayır","Buğday","Çit","Ahır","Traktör İzi","Saman","Değirmen","Bereket"],"desert":["Kum","Kaktüs","Serap","Vaha","Kum Fırtınası","Sıcak Dalga","Dune","Akrep"],"winter":["Kar","Buz","Çam","Kardan Adam","Tipi","Sarkıt","Kızak","Don"],"beach":["Dalga","Kum Tepesi","Palmiye","Deniz Kabuğu","Gelgit","Yengeç","Şemsiye","Köpük"],"mountains":["Zirve","Kaya","Uçurum","Çığ","Sis","Keçi Yolu","Yamaç","Vadi"],"city":["Bina","Trafik","Rampa","Köprü","Metro","Vinç","Kaldırım","Neon"],"arctic":["Buzul","Aysberg","Fok","Kar Körü","Kutup Işığı","Çatlak","Fırtına","Zemheri"],"jungle":["Sarmaşık","Bataklık Kökü","Şelale","Maymun","Yaprak","Nem","Kütük","Liana"],"mars":["Krater","Toz","Kaya","Düşük Yerçekimi","Fırtına","Kanyon","Kızıl Kum","Meteor"],"cave":["Sarkıt","Dikit","Karanlık","Yarasa","Damla","Kristal","Uçurum","Yankı"],"highland":["Tepe","Çimen","Rüzgar","Kaya","Göl","Patika","Sırt","Bulut"],"swamp":["Çamur","Su Birikintisi","Sazlık","Sülük","Buhar","Kütük","Sinek","Balçık"],"volcano":["Lav","Kül","Kaya","Duman","Kıvılcım","Magma","Çatlak","Isı"],"underwater":["Akıntı","Mercan","Balık","Kabarcık","Yosun","Basınç","Batık","Girdap"],"moon":["Krater","Toz","Düşük Yerçekimi","Yıldız","Kaya","Sessizlik","Zıplama","Boşluk"],"neon_city":["Neon","Hologram","Rampa","Lazer","Işık","Sentetik","Grid","Puls"],"wasteland":["Enkaz","Pas","Kum","Metal","Kum Fırtınası","Varil","Çatlak","Toz"],"canyon":["Kaya Duvarı","Nehir","Uçurum","Kırmızı Toz","Yankı","Rüzgar","Katman","Geçit"],"otoyol":["Asfalt","Şerit","Bariyer","Tabela","Köprü","Tünel","Rampa","Hız"],"dag":["Sarp","Kaya","Tırtık","Zirve","Uçurum","Yamaç","Sırt","Buz"],"hotwheels":["Loop","Boost Pad","Rampa","Mıknatıs","Yerçekimi Kuyusu","Turbo","Sıçrama","Halka"],"construction":["Moloz","Vinç","Boru","Kum","İskele","Beton","Toprak","Delik"],"blizzard":["Tipi","Buz","Kar Yığını","Rüzgar","Don","Çığ","Kör Nokta","Zemheri"],"candy":["Şeker","Karamel","Çikolata","Jelibon","Şurup","Kurabiye","Marshmallow","Sakız"],"toxic":["Asit","Varil","Duman","Radyasyon","Balçık","Sızıntı","Buhar","Mutasyon"],"rollercoaster":["Ray","İniş","Çıkış","Loop","Dönüş","Vagonet","Hız","Bariyer"],"skyland":["Bulut","Ada","Rüzgar","Köprü","Gökkuşağı","Kuş","Uçurum","Yükseklik"],"sakura":["Sakura","Yaprak","Torii","Fener","Koi","Köprü","Bahçe","Huzur"],"graveyard":["Mezar Taşı","Ölü Ağaç","Sis","Ruh","Yarasa","Parmaklık","Dolunay","Ürperti"],"lava_river":["Lav","Kaya","Kül","Duman","Kıvılcım","Magma","Isı","Köprü"],"crystal_cave":["Kristal","Işıltı","Sarkıt","Yankı","Damla","Prizma","Karanlık","Maden"],"cyber_grid":["Neon","Grid","Veri","Lazer","Hologram","Devre","Puls","Piksel"],"autumn":["Yaprak","Rüzgar","Ağaç","Mantar","Kestane","Sis","Patika","Hasat"],"glacier":["Buz","Kar","Çatlak","Rüzgar","Aysberg","Kristal","Kayma","Don"],"savanna":["Çimen","Akasya","Toz","Sıcak","Sürü","Güneş","Vaha","Rüzgar"],"ruins":["Sütun","Taş","Toz","Kum","Tapınak","Yosun","Kırık","Hazine"],"mushroom":["Mantar","Spor","Işıltı","Zıplama","Nem","Yosun","Renk","Büyü"],"stormpeak":["Şimşek","Rüzgar","Yağmur","Bulut","Kaya","Gök Gürültüsü","Sis","Zirve"],"carnival":["Çadır","Dönme Dolap","Balon","Işık","Patlamış Mısır","Bayrak","Atlıkarınca","Şenlik"],"windmill":["Değirmen","Lale","Kanal","Köprü","Takunya","Peynir","Rüzgar","Kırsal"],"bamboo":["Bambu","Fener","Pagoda","Panda","Sis","Taş Yol","Rüzgar","Huzur"],"rainbow_road":["Gökkuşağı","Yıldız","Prizma","Boost","Işık","Renk","Halka","Parıltı"],"sandstorm":["Kum","Rüzgar","Dune","Fırtına","Toz","Serap","Kavurga","Girdap"],"crystal_forest":["Kristal","Işıltı","Prizma","Geode","Damla","Yankı","Zemheri","Maden"],"desert_oasis":["Palmiye","Vaha","Su","Sazlık","Kum","Kaktüs","Serap","Gölge"],"junkyard":["Enkaz","Pas","Varil","Lastik","Vinç","Metal","Moloz","Kanca"],"cyberpunk_roofs":["Neon","Hologram","Anten","Kablo","Çatı","Devre","Puls","Işık"],"cloud_kingdom":["Bulut","Ada","Gökkuşağı","Kule","Kanat","Rüzgar","Köprü","Huzur"],"meteor_field":["Krater","Meteor","Kaya","Toz","Kıvılcım","Boşluk","Isı","Çarpma"],"firefly_forest":["Ateşböceği","Mantar","Ağaç","Işıltı","Nem","Yaprak","Gece","Fısıltı"],"aurora_peak":["Işık","Çam","Buz","Kar","Zirve","Rüzgar","Perde","Zemheri"]};
  var META={"countryside":{"e":"🌾","c":"#8bc34a","t":"Kırsal"},"desert":{"e":"🏜️","c":"#e0a94b","t":"Çöl"},"winter":{"e":"❄️","c":"#9fd3e8","t":"Kış"},"beach":{"e":"🏖️","c":"#f4d06f","t":"Sahil"},"mountains":{"e":"⛰️","c":"#8d99ae","t":"Dağlar"},"city":{"e":"🏙️","c":"#7f8c9b","t":"Şehir"},"arctic":{"e":"🧊","c":"#bfe6f0","t":"Kutup"},"jungle":{"e":"🌴","c":"#4caf7d","t":"Orman"},"mars":{"e":"🔴","c":"#c1613f","t":"Mars"},"cave":{"e":"🕳️","c":"#6b5b73","t":"Mağara"},"highland":{"e":"🏔️","c":"#9db38b","t":"Yayla"},"swamp":{"e":"🐸","c":"#6d8c5a","t":"Bataklık"},"volcano":{"e":"🌋","c":"#d1493f","t":"Yanardağ"},"underwater":{"e":"🌊","c":"#3aa8c1","t":"Sualtı"},"moon":{"e":"🌙","c":"#c9c9d4","t":"Ay"},"neon_city":{"e":"🌆","c":"#b14bd8","t":"Neon Şehir"},"wasteland":{"e":"☢️","c":"#a68b5b","t":"Çorak"},"canyon":{"e":"🏞️","c":"#cf7d4a","t":"Kanyon"},"otoyol":{"e":"🛣️","c":"#8891a0","t":"Otoyol"},"dag":{"e":"🗻","c":"#7c8a99","t":"Dağ Zirvesi"},"hotwheels":{"e":"🏎️","c":"#ff7043","t":"Hot Yol"},"construction":{"e":"🚧","c":"#e0b23c","t":"İnşaat"},"blizzard":{"e":"🌨️","c":"#c3d8e8","t":"Kar Fırtınası"},"candy":{"e":"🍭","c":"#f18fb0","t":"Şeker"},"toxic":{"e":"🧪","c":"#8bc24a","t":"Toksik"},"rollercoaster":{"e":"🎢","c":"#e05b8f","t":"Hız Treni"},"skyland":{"e":"🌤️","c":"#5aa0e0","t":"Gökada"},"sakura":{"e":"🌸","c":"#f48fb1","t":"Sakura Bahçesi"},"graveyard":{"e":"🪦","c":"#7a6a9a","t":"Mezarlık"},"lava_river":{"e":"🌋","c":"#e0541a","t":"Lav Nehri"},"crystal_cave":{"e":"💎","c":"#7a5ad0","t":"Kristal Mağara"},"cyber_grid":{"e":"🌐","c":"#18d0b0","t":"Siber Izgara"},"autumn":{"e":"🍂","c":"#d07a2a","t":"Sonbahar"},"glacier":{"e":"🧊","c":"#8cd0ee","t":"Buzul"},"savanna":{"e":"🦁","c":"#e0b85a","t":"Savan"},"ruins":{"e":"🏛️","c":"#c2a878","t":"Antik Harabeler"},"mushroom":{"e":"🍄","c":"#c05ad0","t":"Mantar Diyarı"},"stormpeak":{"e":"⛈️","c":"#6a68a0","t":"Fırtına Zirvesi"},"carnival":{"e":"🎪","c":"#e5487f","t":"Lunapark"},"windmill":{"e":"🌷","c":"#e8734a","t":"Yel Değirmeni"},"bamboo":{"e":"🎋","c":"#4a9e5c","t":"Bambu Ormanı"},"rainbow_road":{"e":"🌈","c":"#ff5aa0","t":"Gökkuşağı Yolu"},"sandstorm":{"e":"🌪️","c":"#c8934a","t":"Çöl Fırtınası"},"crystal_forest":{"e":"💠","c":"#5ad8ff","t":"Kristal Orman"},"desert_oasis":{"e":"🏝️","c":"#d8b45a","t":"Çöl Vahası"},"junkyard":{"e":"🗑️","c":"#8a7a58","t":"Hurdalık"},"cyberpunk_roofs":{"e":"🌃","c":"#b02bff","t":"Siberpunk Çatılar"},"cloud_kingdom":{"e":"☁️","c":"#b8d0ee","t":"Bulut Krallığı"},"meteor_field":{"e":"☄️","c":"#7a6ab0","t":"Meteor Tarlası"},"firefly_forest":{"e":"✨","c":"#5aa860","t":"Ateşböceği Ormanı"},"aurora_peak":{"e":"🌌","c":"#5affb4","t":"Kutup Işıkları"}};
  var NEWM={"crystal_cave":1,"ruins":1,"mushroom":1,"skyland":1,"autumn":1,"lava_river":1,"savanna":1,"cyber_grid":1,"stormpeak":1,"glacier":1,"sakura":1,"graveyard":1,"carnival":1,"windmill":1,"bamboo":1};
  var HWF=["Dev Loop","Boost Pad","Zıplama Rampası","Mıknatıs Şerit","Yerçekimi Kuyusu","Turbo Tüneli","Sıçrama Halkası","Hız Bölgesi","Ters Loop","Çift Loop","Spiral Rampa","Havai Köprü","Yavaşlatma Bölgesi","Yaylı Trambolin","Roket Fırlatıcı","Zıp Zıp Pistonlar","Dönen Platform","Kayan Buz Şeridi","Yapışkan Zemin","Nitro Yağmuru","Altın Loop","Elmas Halka","Çekim Alanı","İtme Alanı","Zaman Yavaşlatıcı","Devasa Rampa","Mini Loop Dizisi","Manyetik Tavan","Fan İtici","Sıçratan Yay","Lav Atlama","Yıldız Kapısı","Hız Katlayıcı","Ağırlıksız Bölge","Bumerang Rampa","Katapult","Dalga Pisti","Zigzag Şerit","Ters Yerçekimi","Süper Nitro Pad","Kombo Halkaları","Puan Çarpanı Kapısı","Görünmez Rampa","Portal Geçidi","Roket Sıçraması","Tırmanma Duvarı","Kayan Köprü","Şimşek Şeridi","Devasa Trambolin","Sonsuz Loop"];
  var ENVK=["Meteor Yağmuru","Deprem","Çığ","Kasırga","Sel Baskını","Orman Yangını","Volkanik Patlama","Tsunami","Şimşek Fırtınası","Yoğun Sis","Kum Fırtınası","Buz Fırtınası","Tornado","Göktaşı","Heyelan","Zehirli Bulut","Güneş Patlaması","Kara Delik"];
  var _cache={};
  function sl(mid,p,cat,label,d){ return {i:mid+"_"+p,c:cat,l:label,t:"s",mn:1,mx:10000,d:d,u:"%",st:5}; }
  function genSpecific(mid,keys,N){
    var out=[];
    for(var p=0;p<N;p++){
      var b=Math.floor(p/64), o=p%64, k=keys[b%keys.length];
      if(o<56){ var a=ASP[o]; out.push(sl(mid,p,k,k+" "+a[0],a[1])); }
      else { out.push({i:mid+"_"+p,c:k,l:k+" "+TOG[o-56],t:"t",d:0}); }
    }
    return out;
  }
  function genNew(mid,keys){
    var out=[];
    for(var gg=0;gg<400;gg++){ var a=ASP[gg%ASP.length]; out.push(sl(mid,gg,"Genel","Genel Ayar "+(gg+1)+" - "+a[0],a[1])); }
    var ti=0;
    for(var p=400;p<500;p++){ var k=keys[ti%keys.length], a2=ASP[ti%ASP.length]; out.push(sl(mid,p,"Özel: "+k,k+" "+a2[0],a2[1])); ti++; }
    return out;
  }
  function build(m){
    if(_cache[m]) return _cache[m];
    var arr;
    if(m==='environment'){ arr=genSpecific('env',ENVK,1000); }
    else if(NEWM[m]){ arr=genNew(m,KEYS[m]||['A']); }
    else {
      arr=genSpecific(m,KEYS[m]||['A'],500);
      if(m==='hotwheels'){ for(var i=0;i<50;i++){ arr[i]={i:'hw_feat_'+i,c:'Loop & Özellikler',l:HWF[i],t:'t',d:(i<6?1:0)}; } }
    }
    _cache[m]=arr; return arr;
  }
  // SPECIFIC proxy: map id verince lazy üretir
  var SPECIFIC=new Proxy({}, { get:function(t,p){ if(typeof p!=='string')return undefined; if(p==='environment'||p==='hotwheels'||META[p]||NEWM[p]) return build(p); return undefined; }, has:function(t,p){ return p==='environment'||!!META[p]; } });
  var MAPS_META={};
  for(var mk in META){ MAPS_META[mk]={emoji:META[mk].e,col:META[mk].c,theme:META[mk].t}; }

  // ── MAP TUNE: her haritaya kendine özgü sürüş hissi (temaya göre fizik çarpanları, % cinsinden; 100=normal) ──
  // Yalnızca kullanıcı bu ayarı elle değiştirmediyse geçerli; store() (kullanıcı override) her zaman önceliklidir.
  var MAPTUNE={
    // Kırsal/doğa — dengeli, sürtünmeli çim
    countryside:{grip:110,max_speed:100,drive_power:100,mass:105,roll_resist:115,susp_stiff:95},
    windmill:{grip:115,max_speed:100,drive_power:95,mass:105,roll_resist:118},
    autumn:{grip:105,max_speed:92,drive_power:92,roll_resist:135,momentum:95},
    sakura:{grip:120,max_speed:96,drive_power:98,roll_resist:112,momentum:102,susp_damp:110},
    bamboo:{grip:115,max_speed:86,drive_power:92,roll_resist:128,mass:105},
    // Buz/kar — düşük grip (kaygan), yumuşak fren, momentum korunur
    winter:{grip:55,brake_power:65,max_speed:104,drive_power:94,momentum:122,roll_resist:70,susp_stiff:88},
    arctic:{grip:50,brake_power:60,max_speed:100,drive_power:92,momentum:126,roll_resist:66,mass:110},
    blizzard:{grip:48,brake_power:58,max_speed:96,drive_power:90,momentum:120,roll_resist:64},
    glacier:{grip:44,brake_power:54,max_speed:100,drive_power:92,momentum:132,roll_resist:58,susp_stiff:112},
    // Kum/çöl — orta grip, ağır his, yüksek yuvarlanma direnci
    desert:{grip:90,mass:130,drive_power:90,max_speed:96,roll_resist:132,momentum:90,susp_stiff:90},
    savanna:{grip:95,mass:120,drive_power:95,max_speed:100,roll_resist:122,momentum:92},
    wasteland:{grip:85,mass:135,drive_power:88,max_speed:90,roll_resist:138,brake_power:95},
    canyon:{grip:100,mass:115,drive_power:100,max_speed:112,roll_resist:110,momentum:108},
    ruins:{grip:95,mass:125,drive_power:90,max_speed:94,roll_resist:126,susp_stiff:105},
    construction:{grip:105,mass:142,drive_power:92,max_speed:88,roll_resist:120,susp_stiff:122},
    beach:{grip:95,mass:100,drive_power:98,max_speed:106,roll_resist:120,susp_damp:92},
    // Ay/uzay — düşük yerçekimi, uzun zıplama, yüksek hava kontrolü
    mars:{gravity:55,air_control:130,max_speed:110,drive_power:100,momentum:112,susp_damp:88},
    moon:{gravity:44,air_control:142,max_speed:106,drive_power:98,momentum:120,wheelie_torque:112},
    skyland:{gravity:60,air_control:136,max_speed:116,drive_power:102,momentum:110,wheelie_torque:110},
    // Şehir/otoyol/siber — yüksek grip, yüksek hız, güçlü fren
    city:{grip:122,max_speed:140,drive_power:120,brake_power:120,mass:100,susp_stiff:110},
    otoyol:{grip:130,max_speed:170,drive_power:132,brake_power:126,susp_stiff:120,roll_resist:80},
    neon_city:{grip:126,max_speed:150,drive_power:125,brake_power:118,boost_power:132},
    cyber_grid:{grip:136,max_speed:162,drive_power:130,gravity:90,boost_power:142,roll_resist:75},
    // Orman/bataklık/mantar — düşük hız, yüksek sürtünme, yapışkan
    jungle:{grip:110,max_speed:80,drive_power:90,roll_resist:150,mass:110,momentum:85},
    swamp:{grip:85,max_speed:70,drive_power:85,roll_resist:165,mass:125,momentum:74},
    mushroom:{grip:100,max_speed:90,drive_power:96,susp_stiff:58,susp_damp:66,gravity:86,wheelie_torque:120},
    toxic:{grip:80,max_speed:86,drive_power:88,roll_resist:132,mass:118,momentum:82},
    // Volkan/lav — ağır, sıcak, kaçış için boost
    volcano:{grip:100,mass:122,max_speed:100,drive_power:106,momentum:105,boost_power:118},
    lava_river:{grip:96,mass:116,max_speed:106,drive_power:106,momentum:110,boost_power:124},
    // Mağara/kristal/mezarlık — teknik, sıkı, karanlık ağır
    cave:{grip:100,max_speed:84,drive_power:98,brake_power:112,mass:106,susp_stiff:108},
    crystal_cave:{grip:90,max_speed:90,drive_power:96,brake_power:106,susp_stiff:112,momentum:94},
    graveyard:{grip:85,max_speed:88,drive_power:92,mass:112,momentum:90,brake_power:100},
    // Dağ/yayla — sarp tırmanış, sağlam, güçlü tork
    mountains:{grip:105,drive_power:116,max_speed:94,mass:116,wheelie_torque:106,susp_stiff:122},
    highland:{grip:110,drive_power:106,max_speed:100,mass:106,susp_stiff:108},
    dag:{grip:100,drive_power:122,max_speed:90,mass:122,wheelie_torque:108,susp_stiff:126},
    stormpeak:{grip:88,drive_power:110,max_speed:94,mass:108,brake_power:94,momentum:100,roll_resist:100},
    // Sualtı — süzülen, sürüklenen, ağır sönüm
    underwater:{gravity:70,max_speed:80,drive_power:92,roll_resist:145,momentum:78,air_control:122,susp_damp:135},
    // Arcade/hotwheels/hız — çok hızlı, tutuşlu, zıp zıp
    hotwheels:{max_speed:162,drive_power:140,boost_power:152,grip:132,gravity:90,brake_power:120},
    rollercoaster:{max_speed:150,grip:140,drive_power:126,momentum:130,susp_stiff:130,brake_power:118},
    candy:{grip:96,susp_stiff:54,susp_damp:60,max_speed:100,drive_power:100,wheelie_torque:116,gravity:90},
    carnival:{max_speed:110,grip:112,drive_power:110,susp_stiff:80,boost_power:120,momentum:105},
    // ── 10 yeni harita ──
    // Gökkuşağı arcade — çok hızlı, tutuşlu, zıp zıp boost
    rainbow_road:{max_speed:150,grip:130,drive_power:128,boost_power:140,susp_stiff:110,momentum:115},
    // Çöl fırtınası — ağır kum, rüzgar direnci, yavaş
    sandstorm:{grip:88,mass:128,drive_power:88,max_speed:90,roll_resist:140,momentum:86,susp_stiff:92},
    // Kristal orman — teknik, hafif kaygan kristal, sıkı fren
    crystal_forest:{grip:96,max_speed:92,drive_power:96,brake_power:104,susp_stiff:108,momentum:98},
    // Çöl vahası — yumuşak kum, orta ağırlık
    desert_oasis:{grip:100,mass:112,drive_power:96,max_speed:100,roll_resist:118,susp_damp:105},
    // Hurdalık — çok ağır, engebeli, sağlam süspansiyon
    junkyard:{grip:102,mass:138,drive_power:92,max_speed:88,roll_resist:126,susp_stiff:120,brake_power:98},
    // Siberpunk çatılar — hızlı şehir, tutuşlu, boost
    cyberpunk_roofs:{grip:128,max_speed:150,drive_power:126,brake_power:120,boost_power:134,roll_resist:80},
    // Bulut krallığı — düşük yerçekimi, süzülen, yüksek hava kontrolü
    cloud_kingdom:{gravity:58,air_control:138,max_speed:114,drive_power:100,momentum:112,wheelie_torque:110},
    // Meteor tarlası — düşük yerçekimi, kayalık uzay, ağır
    meteor_field:{gravity:52,air_control:130,max_speed:104,mass:110,momentum:118,susp_stiff:110},
    // Ateşböceği ormanı — karanlık orman, yapışkan, yavaş
    firefly_forest:{grip:108,max_speed:82,drive_power:92,roll_resist:145,mass:108,momentum:86,susp_damp:110},
    // Kutup ışıkları — buzlu kar, kaygan, momentum korunur
    aurora_peak:{grip:52,brake_power:60,max_speed:100,drive_power:92,momentum:126,roll_resist:66,susp_stiff:96}
  };
  function store(){ if(typeof SaveData==='undefined'||!SaveData.data)return {}; if(!SaveData.data.mapSettings)SaveData.data.mapSettings={}; return SaveData.data.mapSettings; }
  function defList(m){ if(m==='environment')return build('environment'); return COMMON.concat(build(m)); }
  function envDefs(){ return build('environment'); }
  function findDef(m,id){ var i; for(i=0;i<COMMON.length;i++)if(COMMON[i].i===id)return COMMON[i]; var sp=defList(m); for(i=0;i<sp.length;i++)if(sp[i].i===id)return sp[i]; return null; }
  function get(m,id){ var s=store()[m]; if(s&&(id in s))return s[id]; var mt=MAPTUNE[m]; if(mt&&(id in mt))return mt[id]; var d=findDef(m,id); return d?(d.t==='t'?!!d.d:d.d):0; }
  function set(m,id,v){ var st=store(); (st[m]=st[m]||{})[id]=v; if(typeof SaveData!=='undefined'&&SaveData.save)SaveData.save(); }
  function reset(m){ var st=store(); delete st[m]; if(typeof SaveData!=='undefined'&&SaveData.save)SaveData.save(); }
  function resetAll(){ if(typeof SaveData!=='undefined'&&SaveData.data){SaveData.data.mapSettings={}; if(SaveData.save)SaveData.save();} }
  function val(m,id){ var v=get(m,id); return (v===true)?1:(v===false)?0:(+v||0); }
  function on(m,id){ return !!get(m,id); }
  function mult(m,id){ return val(m,id)/100; }
  function meta(m){ return MAPS_META[m]||{emoji:'🗺️',col:'#888',theme:m}; }
  function categoriesFor(m){ var seen={},out=[],l=defList(m); for(var i=0;i<l.length;i++){ if(!seen[l[i].c]){seen[l[i].c]=1;out.push(l[i].c);} } return out; }
  function terrainAmp(m){return mult(m,'hill_height');} function terrainStretch(m){return mult(m,'hill_width');}
  function gravityMult(m){return mult(m,'gravity');} function driveMult(m){return mult(m,'drive_power');}
  function brakeMult(m){return mult(m,'brake_power');} function wheelieMult(m){return mult(m,'wheelie_torque');}
  function airCtrlMult(m){return mult(m,'air_control');} function maxSpeedMult(m){return mult(m,'max_speed');}
  function boostMult(m){return mult(m,'boost_power');} function fuelBurnMult(m){return mult(m,'fuel_burn');}
  function gripMult(m){return mult(m,'grip');} function massMult(m){return mult(m,'mass');}
  function suspStiffMult(m){return mult(m,'susp_stiff');} function suspDampMult(m){return mult(m,'susp_damp');}
  function coinFreqMult(m){return mult(m,'coin_freq');} function fuelFreqMult(m){return mult(m,'fuel_freq');}
  function obstacleMult(m){return mult(m,'obstacle_dens');} function camZoomMult(m){return mult(m,'cam_zoom');}
  function shakeMult(m){return mult(m,'screen_shake');} function particleMult(m){return mult(m,'particle_dens');}
  function weatherMult(m){return mult(m,'weather_int');} function magnetRadius(m){return val(m,'magnet_radius');}
  function headDeath(m){return !!get(m,'head_death');}

  // ── AÇIKLAMA SİSTEMİ: her ayarın ne işe yaradığını uzun uzun anlatır ──
  var WIRED={gravity:1,drive_power:1,brake_power:1,wheelie_torque:1,air_control:1,max_speed:1,boost_power:1,fuel_burn:1,grip:1,mass:1,susp_stiff:1,susp_damp:1,hill_height:1,hill_width:1,bumpiness:1,roughness:1,micro_bumps:1,dip_depth:1,coin_freq:1,fuel_freq:1,coin_value:1,obstacle_dens:1,weather_int:1,screen_shake:1,particle_dens:1,cam_zoom:1,magnet_radius:1,head_death:1,boost_dur:1,air_downforce:1,ground_snap:1,flip_bonus:1,roll_resist:1,traction_ctrl:1,landing_soft:1,momentum:1,reverse_power:1,auto_balance:1,ramp_freq:1,flat_start:1,terrain_detail:1,cliff_chance:1,plateau_freq:1,valley_depth:1,crest_sharp:1,ground_tex:1,edge_walls:1,soft_should:1,slope_bias:1,noise_oct:1,seed_var:1,grip_var:1,fuel_amount:1,scrap_freq:1,gem_chance:1,chest_luck:1,coin_magnet:1,double_zones:1,reward_mult:1,combo_reward:1,milestone_bonus:1,rock_freq:1,saw_freq:1,spike_freq:1,pit_freq:1,boulder_freq:1,moving_hazard:1,hazard_dmg:1,trap_freq:1,falling_debris:1,hazard_glow:1,safe_zones:1,rain_chance:1,snow_chance:1,fog_density:1,wind_str:1,lightning:1,daynight_speed:1,start_time:1,night_dark:1,puddle_slip:1,ice_slip:1,heat_haze:1,cam_follow:1,trail_len:1,motion_blur:1,color_grade:1,god_rays:1,vignette:1,fov_speed:1,hud_scale:1,ambient_motes:1,slowmo_tricks:1,combo_window:1,nitro_regen:1,respawn:1,checkpoint_freq:1,ghost_racer:1,mirror_mode:1,low_grav_jump:1};
  var CATDESC={Fizik:'aracın hareketini, hızlanmasını ve denge fiziğini',Arazi:'harita zemininin tepe/çukur şeklini',Ekonomi:'altın, yakıt ve ödül ekonomisini',Tehlike:'engelleri ve tehlikeleri',Hava:'hava durumunu, rüzgarı ve zamanı',"Görsel":'kamera, parçacık ve görüntü efektlerini',"Oynanış":'oynanış kurallarını ve yardımcıları',Genel:'bu haritanın genel ayarlarını',"Loop & Özellikler":'bu pistin loop, rampa ve özel parça özelliklerini'};
  var SPECIAL={
   gravity:'Aracın yere ne kadar hızlı düştüğünü belirler. YÜKSEK: ağır, hızlı düşer, havada az kalır, zıplama zorlaşır. DÜŞÜK: hafifler, uzun havada kalır, rampalardan kolayca uçar.',
   drive_power:'Motorun gücü/hızlanması. YÜKSEK: daha hızlı hızlanır, yokuşları kolay tırmanır. DÜŞÜK: ağır kalkış, yokuşta zorlanır.',
   brake_power:'Frenin gücü. YÜKSEK: sert frenler, burun daha çok dalar. DÜŞÜK: yumuşak fren.',
   wheelie_torque:'Gaza basınca önün ne kadar kalktığı (wheelie). YÜKSEK: ön hızla kalkar, tam gazda kolayca takla atıp ölürsün. DÜŞÜK: ön zor kalkar, ölmek zorlaşır.',
   air_control:'Havadayken dönüş kontrolü. YÜKSEK: takla/duruşu havada kolay ayarlarsın. DÜŞÜK: havada kontrol zor.',
   max_speed:'Aracın ulaşabileceği en yüksek hız. YÜKSEK: daha hızlı gider. DÜŞÜK: hız sınırı düşer.',
   boost_power:'Nitro/boost gücü. YÜKSEK: boost çok daha hızlandırır.',
   fuel_burn:'Yakıt tüketim hızı. YÜKSEK: yakıt çabuk biter. DÜŞÜK: uzun süre gider.',
   grip:'Tekerlek tutuşu. YÜKSEK: yol tutuşu artar, kaymaz. DÜŞÜK: kayar, tırmanış zorlaşır.',
   mass:'Aracın ağırlığı. YÜKSEK: ağır, yavaş hızlanır ama sağlam. DÜŞÜK: hafif, fırlar.',
   susp_stiff:'Süspansiyon sertliği. YÜKSEK: sert, sıçramaz. DÜŞÜK: yumuşak, zıplar.',
   hill_height:'Tepelerin yüksekliği. YÜKSEK: kocaman tepeler. DÜŞÜK: düz zemin. (Değiştirip haritayı yeniden başlat.)',
   hill_width:'Tepelerin genişliği. YÜKSEK: geniş, uzun tepeler. DÜŞÜK: dar, sık tepeler.',
   bumpiness:'Zeminin engebesi. YÜKSEK: tümsekli, zıplatan zemin. DÜŞÜK: pürüzsüz.',
   roughness:'Zemin pürüzü/detayı. YÜKSEK: sert, tırtıklı yüzey. DÜŞÜK: düzgün.',
   micro_bumps:'Küçük tümsekler. YÜKSEK: sürekli titreten mini tümsekler. DÜŞÜK: temiz zemin.',
   dip_depth:'Çukur derinliği. YÜKSEK: derin çukurlar. DÜŞÜK: sığ.',
   coin_freq:'Altın sıklığı. YÜKSEK: harita altınla dolar. DÜŞÜK: az altın.',
   fuel_freq:'Yakıt bidonu sıklığı. YÜKSEK: bol yakıt. DÜŞÜK: az yakıt.',
   coin_value:'Her altının değeri. YÜKSEK: altınlar daha çok para eder.',
   obstacle_dens:'Engel yoğunluğu. YÜKSEK: bol engel/tehlike. DÜŞÜK: temiz yol.',
   weather_int:'Hava/rüzgar şiddeti. YÜKSEK: güçlü rüzgar aracı iter.',
   screen_shake:'Ekran sarsıntısı. YÜKSEK: çarpışmada ekran çok sarsılır.',
   particle_dens:'Parçacık yoğunluğu (toz/kıvılcım). YÜKSEK: bol efekt. DÜŞÜK: sade.',
   cam_zoom:'Kamera yakınlığı. YÜKSEK: yakın plan. DÜŞÜK: geniş açı, daha çok görürsün.',
   magnet_radius:'Altın mıknatısı menzili. YÜKSEK: uzaktaki altınları çeker. 0: kapalı.',
   head_death:'Sürücünün kafası yere değince ölüm. AÇIK: takla atıp kafan değince ölürsün (HCR). KAPALI: ölümsüz kafa.',
   susp_damp:'Süspansiyon sönümü (yayın sallanmayı yutması). YÜKSEK: yaylanma çabuk durur, araç oturur. DÜŞÜK: uzun uzun zıplar, hoplar.',
   boost_dur:'Nitro/boost süresi. YÜKSEK: boost daha uzun sürer, tek basışta uzun hızlanırsın. DÜŞÜK: kısa patlama.',
   air_downforce:'Havada aşağı çekim (downforce). YÜKSEK: burun öne bastırılır, hızlı iner, taklayı toparlar. DÜŞÜK: havada serbest süzülür.',
   ground_snap:'Yere yapışma. YÜKSEK: tekerler zemine yapışır, tümseklerde kolay havalanmaz. DÜŞÜK: en ufak tümsekte sıçrar.',
   flip_bonus:'Takla puan bonusu. YÜKSEK: takla ve geri takla daha çok puan/para kazandırır. DÜŞÜK: takla az değer eder.',
   roll_resist:'Yuvarlanma direnci (sürtünme). YÜKSEK: araç kendiliğinden yavaşlar, ivme kaybeder. DÜŞÜK: serbestçe yuvarlanır, hız korunur.',
   traction_ctrl:'Çekiş kontrolü. AÇIK: teker patinajı azalır, kalkış daha tutarlı olur. KAPALI: gaza basınca teker boşa döner, patinaj yapar.',
   landing_soft:'İniş yumuşaklığı. YÜKSEK: sert inişler yumuşar, kötü açıdan inince devrilme/ölüm azalır. DÜŞÜK: sert iniş seni cezalandırır.',
   momentum:'Momentum korunumu. YÜKSEK: kazanılan hız uzun süre korunur, ivme sürer. DÜŞÜK: hız çabuk sönümlenir.',
   reverse_power:'Geri vites gücü. YÜKSEK: geri geri hızlı gider, öne devrilmeyi toparlamak kolaylaşır. DÜŞÜK: geri hareket zayıf.',
   auto_balance:'Otomatik denge. AÇIK: oyun aracı havada dengede tutmaya yardım eder, takla atıp ölmek zorlaşır. KAPALI: denge tamamen sana kalır.',
   ramp_freq:'Rampa sıklığı. YÜKSEK: sık sık zıplama rampası çıkar. DÜŞÜK: düz, rampasız yol.',
   flat_start:'Başlangıçtaki düz alan uzunluğu. YÜKSEK: uzun düz start, hız toplamak için yer. DÜŞÜK: hemen engebe başlar.',
   terrain_detail:'Arazi ince detayı. YÜKSEK: çok katmanlı, karmaşık zemin şekli. DÜŞÜK: sade, basit hatlar.',
   cliff_chance:'Uçurum/dik iniş olasılığı. YÜKSEK: sık dik yamaç ve ani düşüşler. DÜŞÜK: yumuşak eğimler.',
   plateau_freq:'Düz plato sıklığı. YÜKSEK: sık düz yayla kesitleri. DÜŞÜK: sürekli inişli çıkışlı arazi.',
   valley_depth:'Vadi derinliği. YÜKSEK: derin vadiler, dibe uzun iniş. DÜŞÜK: sığ vadiler.',
   crest_sharp:'Tepe zirvelerinin keskinliği. YÜKSEK: sivri tepeler zirvede seni fırlatır. DÜŞÜK: yuvarlak, yumuşak tepeler.',
   ground_tex:'Zemin doku yoğunluğu (görsel desen). YÜKSEK: belirgin, detaylı zemin dokusu. DÜŞÜK: düz renkli zemin.',
   edge_walls:'Harita kenar duvarları. AÇIK: kenarlar duvarla kapanır, dışarı düşmezsin. KAPALI: kenardan düşülebilir.',
   soft_should:'Yol kenarı yumuşaklığı (banket). YÜKSEK: kenarlar yumuşak, tampon gibi tutar. DÜŞÜK: sert kenar.',
   slope_bias:'Genel eğim eğilimi. YÜKSEK: harita daha çok yokuş yukarı meyleder. DÜŞÜK: iniş ağırlıklı. %100 = dengeli.',
   noise_oct:'Arazi gürültü katman sayısı (detay çözünürlüğü). YÜKSEK (kat): daha ince ve girift zemin. DÜŞÜK: kaba, basit dalgalar.',
   seed_var:'Harita tohum çeşitliliği. YÜKSEK: her seferinde daha farklı zemin dizilimi. DÜŞÜK: birbirine benzer haritalar.',
   grip_var:'Yüzeyler arası tutuş değişimi. YÜKSEK: bazı yerler kaygan bazı yerler tutuşlu, sürpriz. DÜŞÜK: her yer eşit tutuşlu.',
   fuel_amount:'Her yakıt bidonunun doldurduğu miktar. YÜKSEK: bidonlar depoyu çok doldurur. DÜŞÜK: az doldurur.',
   scrap_freq:'Hurda/parça toplama sıklığı. YÜKSEK: bol hurda çıkar. DÜŞÜK: seyrek hurda.',
   gem_chance:'Elmas çıkma şansı. YÜKSEK: sık elmas. DÜŞÜK: nadir elmas.',
   chest_luck:'Sandık bulma/açma şansı. YÜKSEK: daha sık ödül sandığı. DÜŞÜK: nadir sandık.',
   coin_magnet:'Altın mıknatısı gücü. YÜKSEK: altınlar araca doğru güçlü çekilir. 0/DÜŞÜK: mıknatıs etkisi yok.',
   double_zones:'2x altın bölgeleri. AÇIK: haritada bazı bölgelerde altınlar iki kat değerli olur. KAPALI: normal değer.',
   reward_mult:'Genel ödül çarpanı. YÜKSEK: tur sonu para/puan çarpanı artar. DÜŞÜK: az kazanç.',
   combo_reward:'Kombo yapınca ek ödül. YÜKSEK: art arda takla/toplama zinciri çok kazandırır. DÜŞÜK: kombo az değer eder.',
   milestone_bonus:'Mesafe kilometre taşı bonusu. YÜKSEK: belli mesafelere ulaşınca büyük bonus. DÜŞÜK: küçük bonus.',
   rock_freq:'Kaya engeli sıklığı. YÜKSEK: yolda sık kaya. DÜŞÜK: az kaya.',
   saw_freq:'Dönen testere sıklığı. YÜKSEK: sık testere tuzağı, çok tehlikeli. DÜŞÜK/0: neredeyse hiç yok.',
   spike_freq:'Çivi/diken tuzağı sıklığı. YÜKSEK: sık diken. DÜŞÜK/0: neredeyse hiç yok.',
   pit_freq:'Çukur tuzağı sıklığı. YÜKSEK: sık dipsiz çukur. DÜŞÜK: az çukur.',
   boulder_freq:'Yuvarlanan dev kaya sıklığı. YÜKSEK: sık kaya seni kovalar. DÜŞÜK/0: nadir.',
   moving_hazard:'Hareketli tehlikeler. AÇIK: sallanan/gidip gelen tehlikeler eklenir. KAPALI: tüm tehlikeler sabit durur.',
   hazard_dmg:'Tehlikelerin verdiği hasar. YÜKSEK: temas anında büyük hasar/ölüm. DÜŞÜK: hafif hasar.',
   trap_freq:'Gizli tuzak sıklığı. YÜKSEK: sık tuzak. DÜŞÜK/0: nadir tuzak.',
   falling_debris:'Yukarıdan düşen enkaz. AÇIK: tepeden taş/enkaz düşer. KAPALI: gökten tehlike gelmez.',
   hazard_glow:'Tehlike parıltısı (uyarı ışığı). YÜKSEK: tehlikeler belirgin parlar, fark etmesi kolay. DÜŞÜK: sönük, fark etmesi zor.',
   safe_zones:'Güvenli bölge sıklığı. YÜKSEK: sık tehlikesiz dinlenme alanı. DÜŞÜK: az güvenli alan, sürekli baskı.',
   rain_chance:'Yağmur olasılığı. YÜKSEK: sık yağmurlu hava, zemin ıslak ve kaygan olabilir. DÜŞÜK: genelde kuru.',
   snow_chance:'Kar olasılığı. YÜKSEK: sık kar, kaygan beyaz zemin. DÜŞÜK/0: karsız hava.',
   fog_density:'Sis yoğunluğu. YÜKSEK: yoğun sis, görüş mesafesi azalır. DÜŞÜK: berrak hava.',
   wind_str:'Rüzgar gücü. YÜKSEK: rüzgar aracı iter/frenler, havada savurur. DÜŞÜK: sakin hava.',
   lightning:'Şimşek. AÇIK: ara ara şimşek çakar ve ekranı aydınlatır. KAPALI: şimşek yok.',
   daynight_speed:'Gece/gündüz döngü hızı. YÜKSEK: gün hızla döner, aydınlık-karanlık çabuk değişir. DÜŞÜK: yavaş geçiş.',
   start_time:'Başlangıç günün saati (saniye cinsinden döngü konumu). Değeri değiştirerek güne sabah/öğle/akşam/gece başlarsın.',
   night_dark:'Gece karanlığının şiddeti. YÜKSEK: geceleri zifiri karanlık, görüş zor. DÜŞÜK: geceler bile aydınlık.',
   puddle_slip:'Su birikintisi kayganlığı. YÜKSEK: ıslak yerlerde teker patinaj yapar, kayar. DÜŞÜK: ıslakken bile tutar.',
   ice_slip:'Buz kayganlığı. YÜKSEK: buzda çok kayar, fren tutmaz. DÜŞÜK/0: buz bile tutuşlu olur.',
   heat_haze:'Sıcak havanın buğu/titreşim etkisi (görsel). YÜKSEK: uzak görüntü sıcaktan dalgalanır. DÜŞÜK: net görüntü.',
   cam_follow:'Kameranın aracı takip yumuşaklığı. YÜKSEK: kamera araca sıkı yapışır. DÜŞÜK: gevşek, geriden yumuşak takip.',
   trail_len:'Araç arkasındaki iz/tozun uzunluğu. YÜKSEK: uzun iz bırakır. DÜŞÜK: kısa iz ya da iz yok.',
   motion_blur:'Hareket bulanıklığı. YÜKSEK: hızda görüntü bulanıklaşır, hız hissi artar. DÜŞÜK: net görüntü.',
   color_grade:'Renk tonlaması yoğunluğu. YÜKSEK: canlı, kontrast renkler. DÜŞÜK: soluk, düz tonlar.',
   god_rays:'Işık huzmeleri efekti. YÜKSEK: güneşten belirgin ışık demetleri. DÜŞÜK: sade ışık.',
   vignette:'Vinyet (köşe kararması). YÜKSEK: ekran köşeleri kararır, sinematik his verir. DÜŞÜK: düz aydınlık.',
   fov_speed:'Hızla görüş açısının açılması. YÜKSEK: hızlanınca kamera geriye açılır, hız hissi güçlenir. DÜŞÜK: sabit açı.',
   hud_scale:'HUD/gösterge boyutu. YÜKSEK: büyük ekran göstergeleri. DÜŞÜK: küçük, sade arayüz.',
   ambient_motes:'Ortamdaki uçuşan zerreler (toz/parıltı). YÜKSEK: havada bol zerre. DÜŞÜK: temiz hava.',
   slowmo_tricks:'Takla ağır çekimi. AÇIK: takla anında zaman yavaşlar, hava hareketini ayarlaman kolaylaşır. KAPALI: normal hız.',
   combo_window:'Kombo zaman aralığı. YÜKSEK: bir sonraki hareketi zincire eklemek için daha uzun süre. DÜŞÜK: dar kombo süresi.',
   nitro_regen:'Nitro dolum hızı. YÜKSEK: boost deposu çabuk dolar. DÜŞÜK: yavaş dolar.',
   respawn:'Kaza sonrası yeniden doğma. AÇIK: ölünce yakın kontrol noktasında canlanırsın. KAPALI: kaza turu bitirir.',
   checkpoint_freq:'Kontrol noktası sıklığı. YÜKSEK: sık checkpoint, ölünce az geri gidersin. DÜŞÜK: seyrek, ölüm pahalıya patlar.',
   ghost_racer:'Hayalet rakip. AÇIK: en iyi turunun hayaleti yanında yarışır. KAPALI: hayalet yok.',
   mirror_mode:'Ayna modu. AÇIK: harita ters/aynalanmış olur, tanıdık pistler yeni gelir. KAPALI: normal yön.',
   low_grav_jump:'Düşük yerçekimli zıplama. AÇIK: zıplayınca ay gibi hafif ve uzun havada kalırsın. KAPALI: normal zıplama.'
  };
  function desc(m,id){
    var d=findDef(m,id); if(!d) return 'Açıklama bulunamadı.';
    var head='「'+d.l+'」\n\n';
    if(SPECIAL[id]) return head+SPECIAL[id]+'\n\n'+(d.t==='t'?'▸ AÇ/KAPA seçeneği.':'▸ Aralık %'+d.mn+'–%'+d.mx+', varsayılan %'+d.d+'.')+'\n✅ Bu ayar oyunu DOĞRUDAN etkiler.';
    var t=head;
    if(d.t==='t') t+='Bu bir AÇ/KAPA seçeneğidir. Açıkken bu özellik etkinleşir, kapalıyken devre dışı kalır.\n\n';
    else t+='Bu bir kaydırıcıdır (aralık %'+d.mn+'–%'+d.mx+', varsayılan %'+d.d+'). YÜKSEK değer bu etkiyi artırır/güçlendirir; DÜŞÜK değer azaltır. %100 = normal.\n\n';
    t+='Kategori: '+d.c+' — '+(CATDESC[d.c]||('“'+d.c+'” grubunu'))+' etkiler.\n\n';
    t+=WIRED[id]?'✅ Bu ayar oyunu DOĞRUDAN etkiler — değiştirip haritayı yeniden başlatınca farkı görürsün.':'ℹ️ Bu ayar şu an ince-ayar için saklanıyor; oynanışa doğrudan etkisi sınırlı olabilir. Uç değerlerde bile oyunu bozmaz (test edildi).';
    return t;
  }

  window.MapSettings={ COMMON:COMMON, SPECIFIC:SPECIFIC, MAPS_META:MAPS_META, desc:desc,
    defList:defList, defsFor:defList, envDefs:envDefs, findDef:findDef, get:get, set:set, reset:reset, resetAll:resetAll,
    val:val, on:on, mult:mult, meta:meta, categoriesFor:categoriesFor,
    terrainAmp:terrainAmp, terrainStretch:terrainStretch, gravityMult:gravityMult, driveMult:driveMult,
    brakeMult:brakeMult, wheelieMult:wheelieMult, airCtrlMult:airCtrlMult, maxSpeedMult:maxSpeedMult,
    boostMult:boostMult, fuelBurnMult:fuelBurnMult, gripMult:gripMult, massMult:massMult,
    suspStiffMult:suspStiffMult, suspDampMult:suspDampMult, coinFreqMult:coinFreqMult, fuelFreqMult:fuelFreqMult,
    obstacleMult:obstacleMult, camZoomMult:camZoomMult, shakeMult:shakeMult, particleMult:particleMult,
    weatherMult:weatherMult, magnetRadius:magnetRadius, headDeath:headDeath,
    COMMON_COUNT:COMMON.length, ENV_COUNT:1000 };
})();
