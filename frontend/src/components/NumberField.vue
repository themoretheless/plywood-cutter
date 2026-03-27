<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: number; min?: number; step?: number }>(), { min: 0, step: 1 })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function dec() { emit('update:modelValue', Math.max(props.min, props.modelValue - props.step)) }
function inc() { emit('update:modelValue', props.modelValue + props.step) }
function onInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(v)) emit('update:modelValue', Math.max(props.min, v))
}
</script>

<template>
  <div class="num-wrap">
    <button type="button" class="num-btn" @click="dec">−</button>
    <input type="number" :value="modelValue" :min="min" :step="step" @input="onInput" />
    <button type="button" class="num-btn" @click="inc">+</button>
  </div>
</template>
