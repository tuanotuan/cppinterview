#include <cstddef>
#include <iostream>

#if defined(__cpp_multidimensional_subscript) && \
    __cpp_multidimensional_subscript >= 202211L
struct Grid {
    int data[6]{};

    int& operator[](std::size_t row, std::size_t column) {
        return data[row * 3 + column];
    }
};
#endif

int main() {
#if defined(__cpp_multidimensional_subscript) && \
    __cpp_multidimensional_subscript >= 202211L
    Grid grid;
    grid[1, 2] = 9;
    std::cout << grid[1, 2] << '\n';
#else
    std::cout << "multidimensional subscript unavailable\n";
#endif
}
