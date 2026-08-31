#include <iostream>

int main() {
    static_assert(__cplusplus > 202002L);
    std::cout << "__cplusplus=" << __cplusplus << '\n';

#if defined(__clang__)
    std::cout << "compiler=Clang " << __clang_major__ << '.'
              << __clang_minor__ << '\n';
#elif defined(__GNUC__)
    std::cout << "compiler=GCC " << __GNUC__ << '.'
              << __GNUC_MINOR__ << '.' << __GNUC_PATCHLEVEL__ << '\n';
#elif defined(_MSC_VER)
    std::cout << "compiler=MSVC " << _MSC_VER << '\n';
#else
    std::cout << "compiler=unknown\n";
#endif
}
