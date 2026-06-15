<script setup lang="ts">
import type {MaybeRef} from "vue";

withDefaults(defineProps<{
  errorMessage?: MaybeRef<string>
  label?: string;
  hint?: string
  orientation?: 'horizontal' | 'vertical'
}>(), {
  orientation: 'vertical'
})
</script>

<template>
  <div>
    <div class="flex gap-4"
    :class="{'flex-col': orientation === 'vertical'}">
      <label
          v-if="label"
          class="text-[0.846rem] font-bold text-[var(--kvex-text-muted-color)]"
      >
        {{ label }}
      </label>
      <slot></slot>
      <small
          v-if="errorMessage"
          class="text-[var(--p-red-400)]"
      >
        {{ errorMessage }}
      </small>
    </div>
    <p v-if="hint" class="m-0 text-xs text-[var(--kvex-text-muted-color)]">
      {{ hint }}
    </p>
  </div>
</template>

<style scoped>

</style>