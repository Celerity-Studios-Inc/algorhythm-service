# NNA Registry Service: Creator's Keyword System Guide v1.5.3
*Explicit Metadata Extraction for Enhanced AlgoRhythm Compatibility*

**Version**: v1.5.3  
**Release Date**: August 2025  
**Target Users**: Content Creators, Editors, Curators  
**Purpose**: Enable creators to explicitly define metadata using keywords for better AI processing and AlgoRhythm recommendations

---

## 🎯 **What's New: Keyword System**

### **Revolutionary Enhancement**
The NNA Registry now supports **explicit keyword extraction** from your creator descriptions. This means you can use specific keywords to tell the AI exactly what information to extract and use as tags for AlgoRhythm recommendations.

### **Why This Matters**
- **🎯 Better AI Processing**: Explicit keywords override AI inference for critical metadata
- **🏷️ Enhanced Tags**: Extracted values become AlgoRhythm-compatible tags
- **🎵 Perfect Recommendations**: More accurate cross-layer compatibility
- **⚡ Faster Processing**: AI focuses on what you explicitly define

---

## 📋 **Keyword System Overview**

### **How It Works**
1. **Use Keywords**: Include specific keywords in your creator description
2. **AI Extraction**: The system automatically extracts what follows each keyword
3. **Tag Generation**: Extracted values become normalized, searchable tags
4. **AlgoRhythm Integration**: Tags enable perfect cross-layer recommendations

### **Keyword Format**
```
keyword [value]
```
**Example**: `"brand Nike"` → tag: `"nike"`

---

## 🎵 **G LAYER - SONGS Keywords**

### **Available Keywords**
| Keyword | Example | Extracted Tag | Purpose |
|---------|---------|---------------|---------|
| `song` | `"song Shake It Off"` | `"shake-it-off"` | Song title |
| `artist` | `"artist Taylor Swift"` | `"taylor-swift"` | Artist name |
| `album` | `"album 1989"` | `"1989"` | Album name |
| `bpm` | `"bpm 128"` | `"bpm-128"` | Beats per minute |
| `genre` | `"genre pop"` | `"pop"` | Music genre |

### **Complete Example**
```
Creator Description: "song Shake It Off, artist Taylor Swift, album 1989, bpm 128, genre pop, upbeat dance track perfect for TikTok"
```

**Extracted Tags**: `["shake-it-off", "taylor-swift", "1989", "bpm-128", "pop", "upbeat", "dance", "tiktok"]`

### **Frontend Helper Text**
```
💡 **Songs Layer Helper**: Use keywords to explicitly define song information:
• song [Song Name] - The title of the track
• artist [Artist Name] - The performing artist
• album [Album Name] - The album it's from
• bpm [Number] - Beats per minute (e.g., 128)
• genre [Genre] - Music genre (e.g., pop, hip-hop, rock)

Example: "song Shake It Off, artist Taylor Swift, album 1989, bpm 128, genre pop"
```

---

## ⭐ **S LAYER - STARS Keywords**

### **Available Keywords**
| Keyword | Example | Extracted Tag | Purpose |
|---------|---------|---------------|---------|
| `performer` | `"performer Beyoncé"` | `"beyonce"` | Performer name |
| `character` | `"character Kimmy"` | `"kimmy"` | Character name |
| `star` | `"star Ariana Grande"` | `"ariana-grande"` | Star name |
| `name` | `"name Kim Kardashian"` | `"kim-kardashian"` | Person name |
| `archetype` | `"archetype Legendary"` | `"legendary"` | Career stage |
| `energy` | `"energy high"` | `"energy-high"` | Energy level |

### **Complete Example**
```
Creator Description: "performer Beyoncé, character Sasha Fierce, archetype Legendary, energy high, confident stage presence"
```

**Extracted Tags**: `["beyonce", "sasha-fierce", "legendary", "energy-high", "confident", "stage"]`

### **Frontend Helper Text**
```
💡 **Stars Layer Helper**: Use keywords to explicitly define performer information:
• performer [Name] - The performer's real name
• character [Name] - The character name (if different)
• star [Name] - Alternative way to specify the star
• name [Name] - General name specification
• archetype [Type] - Career stage (Emerging/Rising/Established/Legendary)
• energy [Level] - Energy level (low/medium/high)

Example: "performer Beyoncé, character Sasha Fierce, archetype Legendary, energy high"
```

---

## 👗 **L LAYER - LOOKS Keywords**

### **Available Keywords**
| Keyword | Example | Extracted Tag | Purpose |
|---------|---------|---------------|---------|
| `brand` | `"brand Nike"` | `"nike"` | Brand name |
| `label` | `"label Adidas"` | `"adidas"` | Alternative brand keyword |
| `style` | `"style streetwear"` | `"streetwear"` | Style category |
| `color` | `"color black"` | `"black"` | Primary color |
| `occasion` | `"occasion party"` | `"party"` | Usage occasion |

### **Complete Example**
```
Creator Description: "brand Nike, style streetwear, color black, occasion party, high-energy athletic wear"
```

**Extracted Tags**: `["nike", "streetwear", "black", "party", "high-energy", "athletic"]`

### **Frontend Helper Text**
```
💡 **Looks Layer Helper**: Use keywords to explicitly define fashion information:
• brand [Brand Name] - The clothing brand (e.g., Nike, Adidas, Gucci)
• label [Brand Name] - Alternative way to specify brand
• style [Style] - Fashion style (e.g., streetwear, formal, casual)
• color [Color] - Primary color (e.g., black, red, blue)
• occasion [Type] - Usage occasion (e.g., party, work, casual)

Example: "brand Nike, style streetwear, color black, occasion party"
```

---

## 💃 **M LAYER - MOVES Keywords**

### **Available Keywords**
| Keyword | Example | Extracted Tag | Purpose |
|---------|---------|---------------|---------|
| `dance` | `"dance hip-hop"` | `"hip-hop"` | Dance style |
| `style` | `"style contemporary"` | `"contemporary"` | Movement style |
| `moves` | `"moves spin jump"` | `"spin-jump"` | Specific moves |
| `energy` | `"energy high"` | `"energy-high"` | Energy level |
| `bpm` | `"bpm 120"` | `"bpm-120"` | Movement tempo |

### **Complete Example**
```
Creator Description: "dance hip-hop, moves spin jump wave, energy high, bpm 120, dynamic choreography"
```

**Extracted Tags**: `["hip-hop", "spin-jump-wave", "energy-high", "bpm-120", "dynamic", "choreography"]`

### **Frontend Helper Text**
```
💡 **Moves Layer Helper**: Use keywords to explicitly define dance information:
• dance [Style] - Dance style (e.g., hip-hop, contemporary, ballet)
• style [Style] - Movement style (e.g., contemporary, classical)
• moves [Move Names] - Specific dance moves (e.g., spin, jump, wave)
• energy [Level] - Energy level (low/medium/high)
• bpm [Number] - Movement tempo (e.g., 120)

Example: "dance hip-hop, moves spin jump wave, energy high, bpm 120"
```

---

## 🌍 **W LAYER - WORLDS Keywords**

### **Available Keywords**
| Keyword | Example | Extracted Tag | Purpose |
|---------|---------|---------------|---------|
| `setting` | `"setting studio"` | `"studio"` | Location setting |
| `location` | `"location beach"` | `"beach"` | Alternative location |
| `place` | `"place stage"` | `"stage"` | General place |
| `mood` | `"mood energetic"` | `"energetic"` | Atmosphere mood |
| `lighting` | `"lighting dramatic"` | `"dramatic"` | Lighting type |
| `weather` | `"weather sunny"` | `"sunny"` | Weather condition |

### **Complete Example**
```
Creator Description: "setting studio, mood energetic, lighting dramatic, weather sunny, professional video environment"
```

**Extracted Tags**: `["studio", "energetic", "dramatic", "sunny", "professional", "video", "environment"]`

### **Frontend Helper Text**
```
💡 **Worlds Layer Helper**: Use keywords to explicitly define environment information:
• setting [Location] - The setting/location (e.g., studio, beach, stage)
• location [Place] - Alternative way to specify location
• place [Place] - General place specification
• mood [Atmosphere] - The mood/atmosphere (e.g., energetic, calm, mysterious)
• lighting [Type] - Lighting type (e.g., dramatic, natural, neon)
• weather [Condition] - Weather condition (e.g., sunny, rainy, clear)

Example: "setting studio, mood energetic, lighting dramatic, weather sunny"
```

---

## 🎯 **Best Practices**

### **Keyword Usage Tips**
1. **Be Specific**: Use exact keywords for best extraction
2. **Multiple Keywords**: You can use multiple keywords in one description
3. **Natural Language**: Keywords work within natural language descriptions
4. **Case Insensitive**: Keywords work regardless of capitalization
5. **Flexible Formatting**: Keywords work with or without punctuation

### **Examples of Good Descriptions**

#### **Songs Layer**
```
✅ Good: "song Shake It Off by artist Taylor Swift, album 1989, bpm 128, genre pop, perfect for dance challenges"
✅ Good: "Artist: Taylor Swift, Song: Shake It Off, Album: 1989, BPM: 128, Genre: Pop"
❌ Avoid: "A song by Taylor Swift" (no keywords used)
```

#### **Stars Layer**
```
✅ Good: "performer Beyoncé, character Sasha Fierce, archetype Legendary, energy high, confident stage presence"
✅ Good: "Star: Beyoncé, Character: Sasha Fierce, Archetype: Legendary, Energy: High"
❌ Avoid: "A performer named Beyoncé" (no keywords used)
```

#### **Looks Layer**
```
✅ Good: "brand Nike, style streetwear, color black, occasion party, high-energy athletic wear"
✅ Good: "Brand: Nike, Style: Streetwear, Color: Black, Occasion: Party"
❌ Avoid: "Nike clothing" (no keywords used)
```

---

## 🔧 **Technical Details**

### **Tag Normalization**
All extracted values are automatically normalized for AlgoRhythm compatibility:
- **Lowercase**: All tags are converted to lowercase
- **Hyphenation**: Spaces become hyphens (`"Taylor Swift"` → `"taylor-swift"`)
- **Special Characters**: Removed except hyphens
- **Duplicates**: Automatically deduplicated

### **Priority System**
1. **Explicit Keywords**: Highest priority (user-defined)
2. **AI Inference**: Lower priority (AI-generated)
3. **Taxonomy Context**: Lowest priority (system-provided)

### **Tag Limits**
- **Maximum Tags**: 20 tags per asset
- **Keyword Tags**: No limit on explicit keyword extraction
- **AI Tags**: Limited to remaining slots after keywords

---

## 🚀 **Implementation Status**

### **✅ Completed**
- **Keyword Extraction System**: All layers implemented
- **Tag Normalization**: Automatic formatting for AlgoRhythm
- **Priority System**: Explicit keywords override AI inference
- **Backend Integration**: Full integration with AI service

### **🔄 In Progress**
- **Frontend Helper Text**: Real-time suggestions during typing
- **Validation System**: Keyword format validation
- **Analytics**: Keyword usage tracking

### **📋 Planned**
- **Advanced Keywords**: Multi-value extraction (e.g., `"brands Nike Adidas"`)
- **Smart Suggestions**: AI-powered keyword recommendations
- **Template System**: Pre-built keyword templates for common use cases

---

## 📞 **Support & Feedback**

### **Getting Help**
- **Documentation**: This guide and related technical docs
- **Frontend Help**: Real-time helper text in the creation interface
- **Support Team**: Contact the development team for technical issues

### **Providing Feedback**
- **Feature Requests**: Suggest new keywords or improvements
- **Bug Reports**: Report issues with keyword extraction
- **User Experience**: Share feedback on the helper text system

---

**Last Updated**: August 2025  
**Version**: v1.5.3  
**Status**: Production Ready
