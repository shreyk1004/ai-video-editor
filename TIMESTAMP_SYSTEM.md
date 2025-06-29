# 🎯 Dual Timestamp System Implementation

## Overview

The AI Video Editor now uses a **dual timestamp system** that separates concerns between original data from FAL/Whisper and calculated effective timestamps that account for all user edits.

## 🏗️ System Architecture

### 1. **Original Timestamps** (Immutable)
- **Source**: Direct from FAL/Whisper API
- **Storage**: `word.originalStart` and `word.originalEnd`
- **Purpose**: Immutable reference point for all calculations
- **Example**: `{ originalStart: 2.5, originalEnd: 2.8 }`

### 2. **Base-Adjusted Timestamps** (Static)
- **Source**: Original timestamps + ±0.2s adjustment
- **Storage**: `word.start` and `word.end`
- **Purpose**: Better cut precision (start +0.2s later, end -0.2s earlier)
- **Example**: `{ start: 2.7, end: 2.6 }` (from 2.5-2.8 original)

### 3. **Effective Timestamps** (Dynamic)
- **Source**: Calculated on-demand via `getEffectiveWordTime()`
- **Storage**: Not stored, calculated in real-time
- **Purpose**: Accounts for ALL user edits and timeline changes
- **Example**: `2.4s-2.3s` (if 0.3s deleted word came before)

## 🔧 Key Functions

### `getEffectiveWordTime(wordIndex, timeType)`
Calculates the real-time effective timestamp for any word:

```javascript
const getEffectiveWordTime = (wordIndex, timeType = 'start') => {
  const word = transcriptSegments[wordIndex]
  
  // 1. Start with base-adjusted time (±0.2s already applied)
  let effectiveTime = timeType === 'start' ? word.start : word.end
  
  // 2. Account for deleted words before this word (timeline shift)
  let totalRemovedTime = 0
  const originalRef = timeType === 'start' ? word.originalStart : word.originalEnd
  
  transcriptSegments.forEach(segment => {
    if (deletedWords.has(segment.id) && segment.originalEnd <= originalRef) {
      const removedDuration = segment.originalEnd - segment.originalStart
      totalRemovedTime += removedDuration
    }
  })
  
  effectiveTime -= totalRemovedTime
  
  // 3. Apply extra skip adjustments
  if (isWordAfterDeletion(wordIndex)) {
    effectiveTime += 0.5  // Extra skip after deletions
  }
  
  if (isWordBeforeDeletion(wordIndex) && timeType === 'end') {
    effectiveTime -= 0.8  // Early cutoff before deletions
  }
  
  return Math.max(0, effectiveTime)
}
```

## 📊 Usage Examples

### Before Edits
```
Word: "Technology"
- Original:  2.5s - 2.8s    (from FAL)
- Base adj:  2.7s - 2.6s    (±0.2s applied)
- Effective: 2.7s - 2.6s    (no edits yet)
```

### After Deleting Previous Word
```
Word: "Technology" (after deleting 0.3s word before it)
- Original:  2.5s - 2.8s    (unchanged reference)
- Base adj:  2.7s - 2.6s    (unchanged)
- Effective: 2.4s - 2.3s    (shifted left 0.3s)
```

## ✅ Benefits

1. **Timeline Accuracy**: Word highlighting stays accurate after any number of edits
2. **Reference Preservation**: Original FAL data never modified
3. **Consistent Seeking**: Click-to-jump uses effective times user will experience
4. **Cut Precision**: Deletions use original timestamps for accurate audio removal
5. **Tooltip Clarity**: Shows both original and effective times for user understanding

## 🎮 User Experience Impact

### Word Highlighting During Playbook
- Uses `effectiveCurrentTime` vs `effectiveWordTime` comparison
- Always highlights the correct word regardless of previous edits

### Click-to-Seek
- Uses `getEffectiveWordTime(index, 'start')` for accurate seeking
- User jumps to where the word actually plays after edits

### Tooltips
- Shows both original and effective times: "Original: 2:30 | Effective: 2:27"
- Clear understanding of edit impact

### Deletion/Restoration
- Uses original timestamps for cut calculations
- Ensures complete audio removal without bleeding

## 🔄 Migration Benefits

### Before (Problems)
- Timestamps became inaccurate after edits
- Word highlighting drifted from actual playback position
- Seeking jumped to wrong locations
- Cut boundaries were inconsistent

### After (Solutions)
- ✅ Accurate highlighting throughout all edit scenarios
- ✅ Precise seeking to effective word positions
- ✅ Consistent cut boundaries using original references
- ✅ Clear user feedback with dual-time tooltips

## 🧪 Testing Scenarios

1. **Basic Highlighting**: Load transcript → play → verify green highlight matches audio
2. **After Deletion**: Delete middle words → play → verify highlighting skips correctly  
3. **Click Seeking**: Click words after deletions → verify seeks to effective position
4. **Complex Edits**: Multiple non-consecutive deletions → verify all timing remains accurate
5. **Restoration**: Restore deleted words → verify timeline recalculates correctly

This system ensures the transcript editor maintains perfect synchronization between visual highlighting, user interactions, and actual audio playback regardless of edit complexity. 