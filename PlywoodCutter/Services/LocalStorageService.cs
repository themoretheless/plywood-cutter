using Microsoft.JSInterop;

namespace PlywoodCutter.Services;

public class LocalStorageService(IJSRuntime js)
{
    public ValueTask<string?> GetAsync(string key) =>
        js.InvokeAsync<string?>("localStorage.getItem", key);

    public ValueTask SetAsync(string key, string value) =>
        js.InvokeVoidAsync("localStorage.setItem", key, value);

    public ValueTask RemoveAsync(string key) =>
        js.InvokeVoidAsync("localStorage.removeItem", key);

    public async Task<T?> GetJsonAsync<T>(string key)
    {
        var json = await GetAsync(key);
        return string.IsNullOrEmpty(json) ? default : System.Text.Json.JsonSerializer.Deserialize<T>(json);
    }

    public ValueTask SetJsonAsync<T>(string key, T value) =>
        SetAsync(key, System.Text.Json.JsonSerializer.Serialize(value));
}
