package com.nkia.Orbis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class OrbisApplication {

	public static void main(String[] args) {
		SpringApplication.run(OrbisApplication.class, args);
	}

}
