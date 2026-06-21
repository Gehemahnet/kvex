<script setup lang="ts">
defineProps<{
	code: string;
	description: string;
	icon: string;
	title: string;
}>();
</script>

<template>
	<main class="grid min-h-screen place-items-center bg-[var(--kvex-app-background)] px-5 py-10 text-[var(--kvex-text-color)]">
		<div class="w-full max-w-[34rem] text-center">
			<div class="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--kvex-accent-color)] text-[var(--kvex-accent-color)]">
				<i :class="icon" class="text-2xl" />
			</div>

			<section class="rounded-[3rem] border-4 border-emerald-200 bg-[var(--kvex-panel-background)] px-8 py-14 shadow-sm max-sm:rounded-[2rem] max-sm:px-6 max-sm:py-10">
				<div class="text-2xl font-semibold text-[var(--kvex-accent-color)]">
					{{ code }}
				</div>
				<h1 class="m-0 mt-5 text-4xl font-bold text-[var(--kvex-symbol-color)] max-sm:text-3xl">
					{{ title }}
				</h1>
				<p class="mx-auto mb-0 mt-4 max-w-[25rem] text-sm leading-6 text-[var(--kvex-text-muted-color)]">
					{{ description }}
				</p>

				<div class="mx-auto mt-10 max-w-[23rem] border-t border-[var(--kvex-panel-border)] pt-8">
					<slot />
				</div>
			</section>
		</div>
	</main>
</template>
