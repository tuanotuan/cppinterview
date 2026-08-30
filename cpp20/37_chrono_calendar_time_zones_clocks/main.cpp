// Day 37: Chrono Calendars, Time Zones, and Clock Conversion
#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;
    year_month_day date{year{2026}, month{8}, day{30}};
    sys_days instant{date};

    std::cout << int(date.year()) << '-'
              << unsigned(date.month()) << '-'
              << unsigned(date.day()) << '\n';
    std::cout << "days since Unix epoch = "
              << instant.time_since_epoch().count() << '\n';

#if defined(__cpp_lib_chrono) && __cpp_lib_chrono >= 201907L
    std::cout << "C++20 time-zone API advertised\n";
#else
    std::cout << "C++20 time-zone database unavailable in this libstdc++\n";
#endif
}
