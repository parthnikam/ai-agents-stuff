
import triton
import triton.language as tl

@triton.jit
def add_kernel(
    x_ptr,  # Pointer to the first matrix
    y_ptr,  # Pointer to the second matrix
    output_ptr,  # Pointer to the output matrix
    n_elements,  # Number of elements in the matrices
    BLOCK_SIZE: tl.constexpr,
):
    pid = tl.program_id(axis=0)  # We use a 1D launch grid for simplicity
    block_start = pid * BLOCK_SIZE
    offsets = block_start + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n_elements
    x = tl.load(x_ptr + offsets, mask=mask)
    y = tl.load(y_ptr + offsets, mask=mask)
    output = x + y
    tl.store(output_ptr + offsets, output, mask=mask)

@triton.jit
def multiply_kernel(
    a_ptr, b_ptr, c_ptr,
    M, N, K,
    stride_am, stride_ak,
    stride_bk, stride_bn,
    stride_cm, stride_cn,
    BLOCK_SIZE_M: tl.constexpr, BLOCK_SIZE_N: tl.constexpr, BLOCK_SIZE_K: tl.constexpr,
    GROUP_SIZE_M: tl.constexpr
):
    pid = tl.program_id(0)
    num_pid_m = tl.cdiv(M, BLOCK_SIZE_M)
    num_pid_n = tl.cdiv(N, BLOCK_SIZE_N)
    num_pid_in_group = GROUP_SIZE_M * num_pid_n
    group_id = pid // num_pid_in_group
    first_pid_m = group_id * GROUP_SIZE_M
    group_size_m = min(num_pid_m - first_pid_m, GROUP_SIZE_M)
    pid_m = first_pid_m + (pid % group_size_m)
    pid_n = (pid % num_pid_in_group) // group_size_m

    offs_am = (pid_m * BLOCK_SIZE_M + tl.arange(0, BLOCK_SIZE_M)) % M
    offs_bn = (pid_n * BLOCK_SIZE_N + tl.arange(0, BLOCK_SIZE_N)) % N
    offs_k = tl.arange(0, BLOCK_SIZE_K)
    a_ptrs = a_ptr + (offs_am[:, None] * stride_am + offs_k[None, :] * stride_ak)
    b_ptrs = b_ptr + (offs_k[:, None] * stride_bk + offs_bn[None, :] * stride_bn)

    accumulator = tl.zeros((BLOCK_SIZE_M, BLOCK_SIZE_N), dtype=tl.float32)
    for k in range(0, K, BLOCK_SIZE_K):
        a = tl.load(a_ptrs)
        b = tl.load(b_ptrs)
        accumulator += tl.dot(a, b)
        a_ptrs += BLOCK_SIZE_K * stride_ak
        b_ptrs += BLOCK_SIZE_K * stride_bk

    c_ptrs = c_ptr + (offs_am[:, None] * stride_cm + offs_bn[None, :] * stride_cn)
    tl.store(c_ptrs, accumulator)

@triton.jit
def normalize_kernel(
    x_ptr,
    output_ptr,
    n_elements,
    mean_ptr,
    std_ptr,
    BLOCK_SIZE: tl.constexpr,
):
    pid = tl.program_id(axis=0)
    block_start = pid * BLOCK_SIZE
    offsets = block_start + tl.arange(0, BLOCK_SIZE)
    mask = offsets < n_elements

    x = tl.load(x_ptr + offsets, mask=mask)
    mean = tl.load(mean_ptr)
    std = tl.load(std_ptr)

    output = (x - mean) / (std + 1e-5) # Add epsilon for numerical stability
    tl.store(output_ptr + offsets, output, mask=mask)

# Example usage (for demonstration, not part of the kernel itself)
if __name__ == '__main__':
    import torch

    # Matrix Addition
    size = 1024
    x = torch.rand(size, device='cuda')
    y = torch.rand(size, device='cuda')
    output_add = torch.empty_like(x)
    n_elements = x.numel()
    grid = lambda meta: (triton.cdiv(n_elements, meta['BLOCK_SIZE']),)
    add_kernel[grid](x, y, output_add, n_elements, BLOCK_SIZE=1024)
    print("Matrix Addition Test (first 5 elements):")
    print("x:", x[:5])
    print("y:", y[:5])
    print("output_add:", output_add[:5])
    print("torch_add:", (x + y)[:5])
    assert torch.allclose(output_add, x + y)
    print("Matrix Addition: PASSED")

    # Matrix Multiplication
    M, N, K = 128, 64, 32
    a = torch.randn((M, K), device='cuda', dtype=torch.float32)
    b = torch.randn((K, N), device='cuda', dtype=torch.float32)
    c = torch.empty((M, N), device='cuda', dtype=torch.float32)

    grid_mul = lambda META: (
        triton.cdiv(M, META['BLOCK_SIZE_M']) * triton.cdiv(N, META['BLOCK_SIZE_N']),
    )
    multiply_kernel[grid_mul](
        a, b, c,
        M, N, K,
        a.stride(0), a.stride(1),
        b.stride(0), b.stride(1),
        c.stride(0), c.stride(1),
        BLOCK_SIZE_M=16, BLOCK_SIZE_N=16, BLOCK_SIZE_K=16,
        GROUP_SIZE_M=8
    )
    print("\nMatrix Multiplication Test (top-left 3x3):")
    print("a (top-left 3x3):\n", a[:3,:3])
    print("b (top-left 3x3):\n", b[:3,:3])
    print("c (top-left 3x3):\n", c[:3,:3])
    print("torch_mul (top-left 3x3):\n", (a @ b)[:3,:3])
    assert torch.allclose(c, a @ b, atol=1e-2)
    print("Matrix Multiplication: PASSED")

    # Normalization
    norm_size = 1024
    data = torch.randn(norm_size, device='cuda')
    output_norm = torch.empty_like(data)
    mean_val = data.mean()
    std_val = data.std()

    mean_tensor = torch.tensor([mean_val], device='cuda')
    std_tensor = torch.tensor([std_val], device='cuda')

    grid_norm = lambda meta: (triton.cdiv(norm_size, meta['BLOCK_SIZE']),)
    normalize_kernel[grid_norm](data, output_norm, norm_size, mean_tensor, std_tensor, BLOCK_SIZE=1024)

    print("\nNormalization Test (first 5 elements):")
    print("data:", data[:5])
    print("output_norm:", output_norm[:5])
    torch_norm = (data - mean_val) / (std_val + 1e-5)
    print("torch_norm:", torch_norm[:5])
    assert torch.allclose(output_norm, torch_norm, atol=1e-3)
    print("Normalization: PASSED")
