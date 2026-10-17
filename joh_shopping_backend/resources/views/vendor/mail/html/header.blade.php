@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
{{-- Embedded as an inline attachment by EmbedMailLogo, so it shows even when the site is on localhost. --}}
<img src="cid:joh-logo" class="brand-logo" height="44" alt="{{ trim($slot) }}" style="height: 44px; width: auto; border: 0;">
</a>
</td>
</tr>
